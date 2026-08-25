<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_admin_login(): void
    {
        $this->get('/admin/users')->assertRedirect('/admin/login');
    }

    public function test_member_cannot_access_the_member_list(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/admin/users')
            ->assertForbidden();
    }

    public function test_admin_sees_registered_members(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $member = User::factory()->create(['nickname' => '텃밭러', 'email' => 'gardener@example.com']);

        $this->actingAs($admin)
            ->get('/admin/users')
            ->assertOk()
            ->assertSee('텃밭러')
            ->assertSee('gardener@example.com');
    }

    public function test_search_by_nickname_or_email_filters_the_list(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $match = User::factory()->create(['nickname' => '토마토킬러', 'email' => 'tomato@example.com']);
        $other = User::factory()->create(['nickname' => '상추매니아', 'email' => 'lettuce@example.com']);

        $this->actingAs($admin)
            ->get('/admin/users?search=토마토')
            ->assertOk()
            ->assertSee($match->nickname)
            ->assertDontSee($other->nickname);

        $this->actingAs($admin)
            ->get('/admin/users?search=lettuce')
            ->assertOk()
            ->assertSee($other->nickname)
            ->assertDontSee($match->nickname);
    }

    public function test_status_filter_shows_only_matching_members(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $active = User::factory()->create(['nickname' => '활성회원', 'status' => UserStatus::Active]);
        $disabled = User::factory()->create(['nickname' => '탈퇴회원', 'status' => UserStatus::Disabled]);

        $this->actingAs($admin)
            ->get('/admin/users?status=disabled')
            ->assertOk()
            ->assertSee($disabled->nickname)
            ->assertDontSee($active->nickname);
    }
}
