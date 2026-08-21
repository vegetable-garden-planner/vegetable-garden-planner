<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SubscriptionPaymentStatus;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SubscriptionPayment> */
class SubscriptionPaymentFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'subscription_id' => Subscription::factory(),
            'portone_payment_id' => 'payment-'.$this->faker->uuid(),
            'status' => SubscriptionPaymentStatus::Paid,
            'amount' => 4_900,
            'currency' => 'KRW',
            'failure_reason' => null,
            'paid_at' => now(),
        ];
    }
}
