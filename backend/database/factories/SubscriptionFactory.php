<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Subscription> */
class SubscriptionFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'plan_code' => 'pro',
            'status' => SubscriptionStatus::Active,
            'portone_billing_key' => 'billing-key-'.$this->faker->uuid(),
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
            'canceled_at' => null,
            'version' => 1,
        ];
    }
}
