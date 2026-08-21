<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Services\Billing\PaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\Fakes\FakePaymentGateway;
use Tests\TestCase;

class ChargeDueSubscriptionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_charges_due_subscriptions_and_extends_the_period(): void
    {
        $gateway = new FakePaymentGateway;
        $this->app->instance(PaymentGateway::class, $gateway);

        $dueSubscription = Subscription::factory()->create([
            'status' => SubscriptionStatus::Active,
            'current_period_end' => now()->subDay(),
            'version' => 1,
        ]);
        $originalPeriodEnd = $dueSubscription->current_period_end;

        Artisan::call('subscriptions:charge-due');

        $dueSubscription->refresh();
        $this->assertSame(SubscriptionStatus::Active, $dueSubscription->status);
        $this->assertEquals($originalPeriodEnd->copy()->addMonth(), $dueSubscription->current_period_end);
        $this->assertSame(2, $dueSubscription->version);
        $this->assertDatabaseHas('subscription_payments', [
            'subscription_id' => $dueSubscription->id,
            'status' => 'paid',
        ]);
    }

    public function test_a_declined_charge_marks_the_subscription_past_due(): void
    {
        $gateway = new FakePaymentGateway;
        $dueSubscription = Subscription::factory()->create([
            'status' => SubscriptionStatus::Active,
            'current_period_end' => now()->subDay(),
            'portone_billing_key' => 'billing-key-declined',
            'version' => 1,
        ]);
        $gateway->failingBillingKeys = ['billing-key-declined'];
        $this->app->instance(PaymentGateway::class, $gateway);

        Artisan::call('subscriptions:charge-due');

        $dueSubscription->refresh();
        $this->assertSame(SubscriptionStatus::PastDue, $dueSubscription->status);
        $this->assertDatabaseHas('subscription_payments', [
            'subscription_id' => $dueSubscription->id,
            'status' => 'failed',
        ]);
    }

    public function test_a_subscription_not_yet_due_is_left_untouched(): void
    {
        $gateway = new FakePaymentGateway;
        $this->app->instance(PaymentGateway::class, $gateway);

        $notDue = Subscription::factory()->create([
            'status' => SubscriptionStatus::Active,
            'current_period_end' => now()->addWeek(),
            'version' => 1,
        ]);

        Artisan::call('subscriptions:charge-due');

        $this->assertDatabaseHas('subscriptions', ['id' => $notDue->id, 'version' => 1]);
        $this->assertDatabaseCount('subscription_payments', 0);
        $this->assertCount(0, $gateway->charges);
    }
}
