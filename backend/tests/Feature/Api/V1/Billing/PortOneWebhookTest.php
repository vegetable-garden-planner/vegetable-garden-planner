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

class PortOneWebhookTest extends TestCase
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

        $this->postJson('/api/v1/webhooks/portone', [
            'type' => 'Transaction.Paid',
            'data' => ['paymentId' => 'payment-1'],
        ])->assertUnauthorized();
    }

    public function test_unknown_payment_id_is_ignored_without_error(): void
    {
        $this->postJson('/api/v1/webhooks/portone', [
            'type' => 'Transaction.Paid',
            'data' => ['paymentId' => 'does-not-exist'],
        ])->assertNoContent();
    }

    public function test_failed_transaction_marks_payment_failed_and_subscription_past_due(): void
    {
        $subscription = Subscription::factory()->create(['status' => SubscriptionStatus::Active]);
        $payment = SubscriptionPayment::factory()->for($subscription)->create([
            'portone_payment_id' => 'payment-1',
            'status' => SubscriptionPaymentStatus::Paid,
        ]);

        $this->postJson('/api/v1/webhooks/portone', [
            'type' => 'Transaction.Failed',
            'data' => ['paymentId' => 'payment-1'],
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
}
