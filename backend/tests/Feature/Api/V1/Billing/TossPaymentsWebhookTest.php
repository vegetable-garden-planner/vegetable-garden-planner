<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Billing;

use App\Enums\SubscriptionPaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Services\Billing\PaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Fakes\FakePaymentGateway;
use Tests\TestCase;

class TossPaymentsWebhookTest extends TestCase
{
    use RefreshDatabase;

    private FakePaymentGateway $gateway;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gateway = new FakePaymentGateway;
        $this->app->instance(PaymentGateway::class, $this->gateway);
    }

    public function test_invalid_signature_is_rejected(): void
    {
        $this->gateway->verifyWebhookSignatureResult = false;

        $this->postJson('/api/v1/webhooks/toss-payments', [
            'eventType' => 'PAYMENT_STATUS_CHANGED',
            'data' => ['orderId' => 'order-1', 'status' => 'DONE'],
        ])->assertUnauthorized();
    }

    public function test_unknown_order_id_is_ignored_without_error(): void
    {
        $this->postJson('/api/v1/webhooks/toss-payments', [
            'eventType' => 'PAYMENT_STATUS_CHANGED',
            'data' => ['orderId' => 'does-not-exist', 'status' => 'DONE'],
        ])->assertNoContent();
    }

    public function test_canceled_payment_marks_payment_failed_and_subscription_past_due(): void
    {
        $subscription = Subscription::factory()->create(['status' => SubscriptionStatus::Active]);
        $payment = SubscriptionPayment::factory()->for($subscription)->create([
            'order_id' => 'order-1',
            'status' => SubscriptionPaymentStatus::Paid,
        ]);

        $this->postJson('/api/v1/webhooks/toss-payments', [
            'eventType' => 'PAYMENT_STATUS_CHANGED',
            'data' => ['orderId' => 'order-1', 'status' => 'CANCELED'],
        ])->assertNoContent();

        $this->assertDatabaseHas('subscription_payments', [
            'id' => $payment->id,
            'status' => SubscriptionPaymentStatus::Failed->value,
        ]);
        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscription->id,
            'status' => SubscriptionStatus::PastDue->value,
        ]);
    }

    public function test_billing_key_deletion_marks_subscription_past_due(): void
    {
        $subscription = Subscription::factory()->create(['status' => SubscriptionStatus::Active]);

        $this->postJson('/api/v1/webhooks/toss-payments', [
            'eventType' => 'BILLING_DELETED',
            'data' => ['customerKey' => $subscription->user_id],
        ])->assertNoContent();

        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscription->id,
            'status' => SubscriptionStatus::PastDue->value,
        ]);
    }
}
