<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\GrowingSpaceType;
use App\Enums\SunlightExposure;
use App\Models\GrowingSpace;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GrowingSpace>
 */
class GrowingSpaceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => fake()->words(2, true),
            'type' => GrowingSpaceType::Garden,
            'sunlight' => SunlightExposure::Full,
            'width_cm' => 200,
            'length_cm' => 300,
            'region' => '서울',
            'address' => null,
            'latitude' => null,
            'longitude' => null,
            'orientation' => null,
            'estimated_sunlight_hours' => null,
            'notes' => '',
            'version' => 1,
        ];
    }
}
