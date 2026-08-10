<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('growing_spaces', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 30);
            $table->string('type', 20);
            $table->string('sunlight', 20);
            $table->unsignedInteger('width_cm');
            $table->unsignedInteger('length_cm');
            $table->string('region', 100);
            $table->text('notes');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('growing_seasons', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('growing_space_id')->constrained()->cascadeOnDelete();
            $table->string('name', 30);
            $table->date('start_date');
            $table->date('end_date');
            $table->text('notes');
            $table->string('featured_crop_id', 100)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->index(['growing_space_id', 'start_date', 'end_date']);
        });

        Schema::create('garden_layouts', function (Blueprint $table): void {
            $table->foreignUuid('season_id')->primary()->constrained('growing_seasons')->cascadeOnDelete();
            $table->foreignUuid('space_id')->constrained('growing_spaces')->cascadeOnDelete();
            $table->unsignedInteger('space_width_cm');
            $table->unsignedInteger('space_length_cm');
            $table->unsignedSmallInteger('cell_size_cm');
            $table->unsignedSmallInteger('columns');
            $table->unsignedSmallInteger('rows');
            $table->json('placements');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });

        Schema::create('cultivation_tasks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('season_id')->constrained('growing_seasons')->cascadeOnDelete();
            $table->string('crop_id', 100)->nullable();
            $table->string('type', 30);
            $table->string('title', 100);
            $table->date('due_date');
            $table->text('notes');
            $table->string('status', 20)->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->index(['season_id', 'status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cultivation_tasks');
        Schema::dropIfExists('garden_layouts');
        Schema::dropIfExists('growing_seasons');
        Schema::dropIfExists('growing_spaces');
    }
};
