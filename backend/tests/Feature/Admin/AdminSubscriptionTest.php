<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\SubscriptionPaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_cannot_access_admin_subscriptions(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/admin/subscriptions')
            ->assertForbidden();
    }

    public function test_admin_sees_subscription_status_and_next_billing_date(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $member = User::factory()->create(['nickname' => '홍길동']);
        Subscription::factory()->for($member)->create([
            'status' => SubscriptionStatus::PastDue,
            'past_due_retry_count' => 1,
        ]);

        $this->actingAs($admin)
            ->get('/admin/subscriptions')
            ->assertOk()
            ->assertSee('홍길동')
            ->assertSee('연체');
    }

    public function test_admin_sees_the_latest_payment_failure_reason(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $member = User::factory()->create(['nickname' => '김철수']);
        $subscription = Subscription::factory()->for($member)->create([
            'status' => SubscriptionStatus::PastDue,
        ]);
        SubscriptionPayment::factory()->for($subscription)->create([
            'status' => SubscriptionPaymentStatus::Failed,
            'failure_reason' => '카드 한도를 초과했습니다.',
        ]);

        $this->actingAs($admin)
            ->get('/admin/subscriptions')
            ->assertOk()
            ->assertSee('카드 한도를 초과했습니다.');
    }

    public function test_admin_can_filter_subscriptions_by_status(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $active = Subscription::factory()->create(['status' => SubscriptionStatus::Active]);
        $canceled = Subscription::factory()->create(['status' => SubscriptionStatus::Canceled]);

        $response = $this->actingAs($admin)
            ->get('/admin/subscriptions?status=canceled')
            ->assertOk();

        $response->assertSee($canceled->user->nickname);
        $response->assertDontSee($active->user->nickname);
    }
}
