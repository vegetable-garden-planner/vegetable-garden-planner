<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('space_memos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('growing_space_id')->constrained('growing_spaces')->restrictOnDelete();
            $table->string('crop_id', 100)->nullable();
            $table->text('body');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->foreign('crop_id')->references('id')->on('crops')->restrictOnDelete();
            $table->index(['growing_space_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('space_memos');
    }
};
