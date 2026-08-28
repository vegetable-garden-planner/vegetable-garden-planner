<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('container_placements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('growing_season_id')->constrained('growing_seasons')->restrictOnDelete();
            $table->foreignUuid('growing_space_id')->constrained('growing_spaces')->restrictOnDelete();
            $table->string('crop_id', 100);
            $table->unsignedSmallInteger('quantity');
            $table->json('position')->nullable();

            $table->foreign('crop_id')->references('id')->on('crops')->restrictOnDelete();
            $table->index('growing_season_id');
            $table->index('growing_space_id');
            $table->index('crop_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('container_placements');
    }
};
