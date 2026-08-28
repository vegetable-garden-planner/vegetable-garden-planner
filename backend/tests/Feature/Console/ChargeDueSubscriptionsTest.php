<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\SubscriptionStatus;
use App\Mail\SubscriptionCanceledMail;
use App\Models\Subscription;
use App\Services\Billing\PaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
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
            'billing_key' => 'billing-key-declined',
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

    public function test_repeated_failures_retry_up_to_the_limit_then_cancel_and_notify(): void
    {
        Mail::fake();
        $gateway = new FakePaymentGateway;
        $gateway->failingBillingKeys = ['billing-key-declined'];
        $this->app->instance(PaymentGateway::class, $gateway);

        $subscription = Subscription::factory()->create([
            'status' => SubscriptionStatus::Active,
            'current_period_end' => now()->subDay(),
            'billing_key' => 'billing-key-declined',
            'version' => 1,
        ]);

        Artisan::call('subscriptions:charge-due');
        $subscription->refresh();
        $this->assertSame(SubscriptionStatus::PastDue, $subscription->status);
        $this->assertSame(1, $subscription->past_due_retry_count);
        $this->assertNotNull($subscription->next_retry_at);
        Mail::assertNothingSent();

        Artisan::call('subscriptions:charge-due');
        $subscription->refresh();
        $this->assertSame(1, $subscription->past_due_retry_count, '재시도 시점이 되지 않으면 다시 청구하지 않는다');

        $subscription->forceFill(['next_retry_at' => now()->subMinute()])->save();
        Artisan::call('subscriptions:charge-due');
        $subscription->refresh();
        $this->assertSame(SubscriptionStatus::PastDue, $subscription->status);
        $this->assertSame(2, $subscription->past_due_retry_count);
        Mail::assertNothingSent();

        $subscription->forceFill(['next_retry_at' => now()->subMinute()])->save();
        Artisan::call('subscriptions:charge-due');
        $subscription->refresh();
        $this->assertSame(SubscriptionStatus::Canceled, $subscription->status);
        $this->assertSame(3, $subscription->past_due_retry_count);
        $this->assertNull($subscription->next_retry_at);
        Mail::assertQueued(SubscriptionCanceledMail::class);
    }

    public function test_a_successful_retry_reactivates_a_past_due_subscription(): void
    {
        $gateway = new FakePaymentGateway;
        $this->app->instance(PaymentGateway::class, $gateway);

        $subscription = Subscription::factory()->create([
            'status' => SubscriptionStatus::PastDue,
            'current_period_end' => now()->subDays(4),
            'past_due_retry_count' => 1,
            'next_retry_at' => now()->subMinute(),
            'version' => 2,
        ]);

        Artisan::call('subscriptions:charge-due');

        $subscription->refresh();
        $this->assertSame(SubscriptionStatus::Active, $subscription->status);
        $this->assertSame(0, $subscription->past_due_retry_count);
        $this->assertNull($subscription->next_retry_at);
    }
}
