<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('garden_layouts', function (Blueprint $table): void {
            $table->foreignUuid('growing_season_id')->primary()->constrained('growing_seasons')->restrictOnDelete();
            $table->foreignUuid('growing_space_id')->constrained('growing_spaces')->restrictOnDelete();
            $table->unsignedInteger('space_width_cm');
            $table->unsignedInteger('space_length_cm');
            $table->unsignedSmallInteger('cell_size_cm');
            $table->unsignedSmallInteger('columns');
            $table->unsignedSmallInteger('rows');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });

        Schema::create('garden_layout_placements', function (Blueprint $table): void {
            $table->foreignUuid('growing_season_id');
            $table->unsignedSmallInteger('cell_index');
            $table->string('crop_id', 100);

            $table->primary(['growing_season_id', 'cell_index']);
            $table->foreign('growing_season_id')
                ->references('growing_season_id')
                ->on('garden_layouts')
                ->cascadeOnDelete();
            $table->foreign('crop_id')->references('id')->on('crops')->restrictOnDelete();
            $table->index('crop_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('garden_layout_placements');
        Schema::dropIfExists('garden_layouts');
    }
};
