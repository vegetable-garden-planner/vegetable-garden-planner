<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cultivation_tasks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('growing_season_id')->constrained('growing_seasons')->restrictOnDelete();
            $table->string('crop_id', 100)->nullable();
            $table->string('type', 30);
            $table->string('title', 100);
            $table->date('due_date');
            $table->text('notes');
            $table->string('status', 20)->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->foreign('crop_id')->references('id')->on('crops')->restrictOnDelete();
            $table->index(['growing_season_id', 'status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cultivation_tasks');
    }
};
