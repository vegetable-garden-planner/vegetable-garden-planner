<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CultivationRecordType;
use App\Models\CultivationRecord;
use App\Models\GrowingSeason;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CultivationRecord> */
class CultivationRecordFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'growing_season_id' => GrowingSeason::factory(),
            'type' => CultivationRecordType::Work,
            'occurred_at' => '2026-05-01T09:00:00+09:00',
            'notes' => fake()->sentence(),
            'quantity' => null,
            'unit' => null,
            'version' => 1,
        ];
    }
}
