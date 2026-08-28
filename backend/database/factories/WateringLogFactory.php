<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use App\Models\WateringLog;
use App\Models\WateringSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<WateringLog> */
class WateringLogFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'watering_schedule_id' => WateringSchedule::factory(),
            'user_id' => User::factory(),
            'scheduled_for' => '2026-05-01T00:00:00Z',
            'watered_at' => '2026-05-01T01:00:00Z',
            'amount_ml' => null,
            'memo' => '',
        ];
    }
}
