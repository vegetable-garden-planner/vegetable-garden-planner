<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\WateringSchedule;
use App\Models\WateringSnooze;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<WateringSnooze> */
class WateringSnoozeFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'watering_schedule_id' => WateringSchedule::factory(),
            'original_at' => '2026-05-01T00:00:00Z',
            'snoozed_until' => '2026-05-02T00:00:00Z',
        ];
    }
}
