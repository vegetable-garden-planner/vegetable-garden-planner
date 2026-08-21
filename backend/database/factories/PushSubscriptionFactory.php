<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PushSubscription> */
class PushSubscriptionFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'endpoint' => 'https://push.example.com/'.$this->faker->uuid(),
            'p256dh_key' => $this->faker->sha256(),
            'auth_token' => $this->faker->md5(),
        ];
    }
}
