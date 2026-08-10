<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GrowingSeason>
 */
class GrowingSeasonFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'growing_space_id' => GrowingSpace::factory(),
            'name' => fake()->words(2, true),
            'start_date' => '2026-03-01',
            'end_date' => '2026-08-31',
            'notes' => '',
            'featured_crop_id' => null,
            'version' => 1,
        ];
    }
}
