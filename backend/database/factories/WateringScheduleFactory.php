<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\GrowingSeason;
use App\Models\WateringSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<WateringSchedule> */
class WateringScheduleFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'growing_season_id' => GrowingSeason::factory(),
            'crop_id' => 'lettuce',
            'interval_days' => 3,
            'next_watering_at' => '2026-05-01T00:00:00Z',
            'enabled' => true,
            'version' => 1,
        ];
    }
}
