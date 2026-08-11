<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cultivation_records', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('growing_season_id')->constrained('growing_seasons')->restrictOnDelete();
            $table->string('type', 30);
            $table->dateTimeTz('occurred_at');
            $table->text('notes');
            $table->decimal('quantity', 12, 3)->nullable();
            $table->string('unit', 20)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['growing_season_id', 'occurred_at']);
            $table->index(['growing_season_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cultivation_records');
    }
};
