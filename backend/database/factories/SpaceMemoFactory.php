<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\GrowingSpace;
use App\Models\SpaceMemo;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SpaceMemo> */
class SpaceMemoFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'growing_space_id' => GrowingSpace::factory(),
            'crop_id' => null,
            'body' => fake()->sentence(),
            'version' => 1,
        ];
    }
}
