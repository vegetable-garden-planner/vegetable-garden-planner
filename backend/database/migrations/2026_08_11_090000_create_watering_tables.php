<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('watering_schedules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('growing_season_id')->constrained('growing_seasons')->restrictOnDelete();
            $table->string('crop_id', 100);
            $table->unsignedSmallInteger('interval_days');
            $table->dateTimeTz('next_watering_at');
            $table->boolean('enabled')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->foreign('crop_id')->references('id')->on('crops')->restrictOnDelete();
            $table->unique(['growing_season_id', 'crop_id']);
            $table->index(['growing_season_id', 'enabled', 'next_watering_at'], 'watering_schedule_due_index');
        });

        Schema::create('watering_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('watering_schedule_id')->constrained('watering_schedules')->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->dateTimeTz('scheduled_for');
            $table->dateTimeTz('watered_at');
            $table->unsignedInteger('amount_ml')->nullable();
            $table->text('memo');
            $table->timestamps();

            $table->index(['watering_schedule_id', 'watered_at']);
        });

        Schema::create('watering_snoozes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('watering_schedule_id')->constrained('watering_schedules')->restrictOnDelete();
            $table->dateTimeTz('original_at');
            $table->dateTimeTz('snoozed_until');
            $table->timestamps();

            $table->index(['watering_schedule_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('watering_snoozes');
        Schema::dropIfExists('watering_logs');
        Schema::dropIfExists('watering_schedules');
    }
};
