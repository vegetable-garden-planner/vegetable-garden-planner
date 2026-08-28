<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Notifications;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_subscribe(): void
    {
        $this->postJson('/api/v1/push-subscriptions', $this->payload())
            ->assertUnauthorized();
    }

    public function test_user_can_subscribe(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/push-subscriptions', $this->payload())
            ->assertNoContent();

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint' => 'https://push.example.com/abc',
            'p256dh_key' => 'p256dh-key',
            'auth_token' => 'auth-token',
        ]);
    }

    public function test_subscribing_the_same_endpoint_again_updates_keys_instead_of_duplicating(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/push-subscriptions', $this->payload())->assertNoContent();
        $this->actingAs($user)->postJson('/api/v1/push-subscriptions', $this->payload([
            'keys' => ['p256dh' => 'rotated-key', 'auth' => 'auth-token'],
        ]))->assertNoContent();

        $this->assertDatabaseCount('push_subscriptions', 1);
        $this->assertDatabaseHas('push_subscriptions', ['p256dh_key' => 'rotated-key']);
    }

    public function test_subscribing_requires_a_valid_endpoint_and_keys(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/push-subscriptions', ['endpoint' => 'not-a-url'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['endpoint', 'keys'], 'error.fields');
    }

    public function test_user_can_unsubscribe(): void
    {
        $user = User::factory()->create();
        $subscription = PushSubscription::factory()->for($user)->create();

        $this->actingAs($user)
            ->deleteJson('/api/v1/push-subscriptions', ['endpoint' => $subscription->endpoint])
            ->assertNoContent();

        $this->assertDatabaseMissing('push_subscriptions', ['id' => $subscription->id]);
    }

    public function test_user_cannot_delete_another_users_subscription(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $subscription = PushSubscription::factory()->for($owner)->create();

        $this->actingAs($other)
            ->deleteJson('/api/v1/push-subscriptions', ['endpoint' => $subscription->endpoint])
            ->assertNoContent();

        $this->assertDatabaseHas('push_subscriptions', ['id' => $subscription->id]);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_replace([
            'endpoint' => 'https://push.example.com/abc',
            'keys' => ['p256dh' => 'p256dh-key', 'auth' => 'auth-token'],
        ], $overrides);
    }
}
