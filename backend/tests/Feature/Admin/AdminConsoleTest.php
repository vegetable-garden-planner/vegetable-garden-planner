<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\GrowingSpace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminConsoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_laravel_home_redirects_to_admin_and_guest_sees_login(): void
    {
        $this->get('/')->assertRedirect('/admin');
        $this->get('/admin')
            ->assertRedirect('/admin/login');
        $this->get('/admin/login')
            ->assertOk()
            ->assertSee('관리자 로그인');
    }

    public function test_only_active_admin_can_login_to_console(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'Admin1234',
            'role' => UserRole::Admin,
            'status' => UserStatus::Active,
        ]);
        $member = User::factory()->create([
            'email' => 'member@example.com',
            'password' => 'Member1234',
        ]);

        $this->post('/admin/login', [
            'email' => $member->email,
            'password' => 'Member1234',
        ])->assertSessionHasErrors('email');

        $this->post('/admin/login', [
            'email' => $admin->email,
            'password' => 'Admin1234',
        ])->assertRedirect('/admin');

        $this->assertAuthenticatedAs($admin);
    }

    public function test_disabled_admin_cannot_login_to_console(): void
    {
        $admin = User::factory()->create([
            'email' => 'disabled-admin@example.com',
            'password' => 'Admin1234',
            'role' => UserRole::Admin,
            'status' => UserStatus::Disabled,
        ]);

        $this->post('/admin/login', [
            'email' => $admin->email,
            'password' => 'Admin1234',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_member_cannot_access_admin_pages(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/admin')
            ->assertForbidden();
    }

    public function test_dashboard_shows_real_operating_counts(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $member = User::factory()->create();
        GrowingSpace::factory()->count(2)->for($member, 'owner')->create();

        $this->actingAs($admin)
            ->get('/admin')
            ->assertOk()
            ->assertSee('서비스의 오늘을 살펴봐요')
            ->assertSee('재배 공간')
            ->assertSee('2');
    }

    public function test_admin_can_disable_member_and_revoke_sessions(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $member = User::factory()->create();
        $sessionId = 'member-session';
        $this->app['db']->table('sessions')->insert([
            'id' => $sessionId,
            'user_id' => $member->id,
            'ip_address' => null,
            'user_agent' => null,
            'payload' => '',
            'last_activity' => time(),
        ]);

        $this->actingAs($admin)
            ->patch("/admin/users/{$member->id}/status", ['status' => 'disabled'])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(UserStatus::Disabled, $member->fresh()->status);
        $this->assertDatabaseMissing('sessions', ['id' => $sessionId]);
    }

    public function test_admin_cannot_disable_another_admin(): void
    {
        $actor = User::factory()->create(['role' => UserRole::Admin]);
        $target = User::factory()->create(['role' => UserRole::Admin]);

        $this->actingAs($actor)
            ->patch("/admin/users/{$target->id}/status", ['status' => 'disabled'])
            ->assertSessionHasErrors('status');

        $this->assertSame(UserStatus::Active, $target->fresh()->status);
    }

    public function test_command_promotes_existing_active_member(): void
    {
        $member = User::factory()->create(['email' => 'operator@example.com']);

        $this->artisan('admin:promote', ['email' => $member->email])
            ->expectsConfirmation("{$member->email} 계정을 관리자로 승격할까요?", 'yes')
            ->expectsOutput('관리자 권한을 부여했습니다.')
            ->assertSuccessful();

        $this->assertSame(UserRole::Admin, $member->fresh()->role);
    }
}
