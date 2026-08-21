<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Billing;

use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Billing\PaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Fakes\FakePaymentGateway;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private FakePaymentGateway $gateway;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gateway = new FakePaymentGateway;
        $this->app->instance(PaymentGateway::class, $this->gateway);
    }

    public function test_guest_cannot_subscribe(): void
    {
        $this->postJson('/api/v1/subscriptions', ['billing_key' => 'billing-key-1'])
            ->assertUnauthorized();
    }

    public function test_user_can_subscribe_with_own_billing_key(): void
    {
        $user = User::factory()->create();
        $this->gateway->billingKeyOwners['billing-key-1'] = $user->id;

        $response = $this->actingAs($user)
            ->postJson('/api/v1/subscriptions', ['billing_key' => 'billing-key-1'])
            ->assertCreated();

        $response->assertJsonPath('data.status', 'active');
        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'status' => SubscriptionStatus::Active->value,
            'portone_billing_key' => 'billing-key-1',
        ]);
        $this->assertDatabaseHas('subscription_payments', [
            'subscription_id' => $response->json('data.id'),
            'status' => 'paid',
        ]);
    }

    public function test_subscribing_with_another_users_billing_key_is_rejected(): void
    {
        $user = User::factory()->create();
        $someoneElseId = (string) Str::uuid();
        $this->gateway->billingKeyOwners['billing-key-1'] = $someoneElseId;

        $this->actingAs($user)
            ->postJson('/api/v1/subscriptions', ['billing_key' => 'billing-key-1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['billing_key'], 'error.fields');

        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_subscribing_with_a_declined_card_returns_the_failure_reason(): void
    {
        $user = User::factory()->create();
        $this->gateway->billingKeyOwners['billing-key-1'] = $user->id;
        $this->gateway->failingBillingKeys = ['billing-key-1'];
        $this->gateway->failureReason = '카드 한도를 초과했습니다.';

        $this->actingAs($user)
            ->postJson('/api/v1/subscriptions', ['billing_key' => 'billing-key-1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['billing_key'], 'error.fields');

        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_subscribing_twice_while_active_is_a_conflict(): void
    {
        $user = User::factory()->create();
        $this->gateway->billingKeyOwners['billing-key-1'] = $user->id;
        $this->gateway->billingKeyOwners['billing-key-2'] = $user->id;

        $this->actingAs($user)
            ->postJson('/api/v1/subscriptions', ['billing_key' => 'billing-key-1'])
            ->assertCreated();

        $this->actingAs($user)
            ->postJson('/api/v1/subscriptions', ['billing_key' => 'billing-key-2'])
            ->assertConflict();
    }

    public function test_user_can_view_their_own_subscription(): void
    {
        $user = User::factory()->create();
        Subscription::factory()->for($user)->create();

        $this->actingAs($user)
            ->getJson('/api/v1/subscriptions/me')
            ->assertOk()
            ->assertJsonPath('data.status', 'active');
    }

    public function test_viewing_subscription_without_one_returns_not_found(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/subscriptions/me')
            ->assertNotFound();
    }

    public function test_user_can_cancel_their_subscription_with_a_valid_if_match(): void
    {
        $user = User::factory()->create();
        $subscription = Subscription::factory()->for($user)->create(['version' => 1]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/subscriptions/{$subscription->id}", [], ['If-Match' => '"1"'])
            ->assertNoContent();

        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscription->id,
            'status' => SubscriptionStatus::Canceled->value,
            'version' => 2,
        ]);
    }

    public function test_canceling_without_if_match_fails_precondition(): void
    {
        $user = User::factory()->create();
        $subscription = Subscription::factory()->for($user)->create(['version' => 1]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/subscriptions/{$subscription->id}")
            ->assertStatus(412);
    }

    public function test_canceling_with_a_stale_version_returns_conflict(): void
    {
        $user = User::factory()->create();
        $subscription = Subscription::factory()->for($user)->create(['version' => 2]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/subscriptions/{$subscription->id}", [], ['If-Match' => '"1"'])
            ->assertStatus(412);
    }

    public function test_user_cannot_cancel_another_users_subscription(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $subscription = Subscription::factory()->for($owner)->create(['version' => 1]);

        $this->actingAs($other)
            ->deleteJson("/api/v1/subscriptions/{$subscription->id}", [], ['If-Match' => '"1"'])
            ->assertForbidden();
    }
}
