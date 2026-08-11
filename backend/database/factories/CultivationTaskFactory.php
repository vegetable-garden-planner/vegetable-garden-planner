<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CultivationTaskStatus;
use App\Enums\CultivationTaskType;
use App\Models\CultivationTask;
use App\Models\GrowingSeason;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CultivationTask> */
class CultivationTaskFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'growing_season_id' => GrowingSeason::factory(),
            'crop_id' => null,
            'type' => CultivationTaskType::Other,
            'title' => fake()->sentence(3),
            'due_date' => '2026-05-01',
            'notes' => '',
            'status' => CultivationTaskStatus::Pending,
            'completed_at' => null,
            'version' => 1,
        ];
    }
}
