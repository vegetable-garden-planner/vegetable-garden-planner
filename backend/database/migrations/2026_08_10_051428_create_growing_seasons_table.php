<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('growing_seasons', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('growing_space_id')->constrained('growing_spaces')->restrictOnDelete();
            $table->string('name', 30);
            $table->date('start_date');
            $table->date('end_date');
            $table->text('notes');
            $table->string('featured_crop_id', 100)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['growing_space_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('growing_seasons');
    }
};
