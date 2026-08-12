<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class GoogleSocialLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_callback_creates_account_and_starts_session(): void
    {
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-123',
            'name' => '새싹 집사',
            'email' => 'garden.google@example.com',
            'verified_email' => true,
        ]));

        $this->withSession(['social_login_next' => '/spaces'])
            ->get('/auth/google/callback')
            ->assertRedirect('http://localhost:3000/spaces');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'garden.google@example.com',
            'nickname' => '새싹 집사',
        ]);
        $this->assertDatabaseHas('social_accounts', [
            'provider' => 'google',
            'provider_user_id' => 'google-123',
        ]);
    }

    public function test_verified_google_email_links_existing_account_without_duplication(): void
    {
        $existing = User::factory()->create(['email' => 'member@example.com']);
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-existing',
            'email' => 'member@example.com',
            'verified_email' => true,
        ]));

        $this->get('/auth/google/callback')->assertRedirect('http://localhost:3000/dashboard');

        $this->assertAuthenticatedAs($existing);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('social_accounts', [
            'user_id' => $existing->id,
            'provider_user_id' => 'google-existing',
        ]);
    }

    public function test_unverified_google_email_is_rejected(): void
    {
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-unverified',
            'email' => 'unverified@example.com',
            'verified_email' => false,
        ]));

        $this->get('/auth/google/callback')
            ->assertRedirect('http://localhost:3000/login?socialError=google');

        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_disabled_existing_account_cannot_login_with_google(): void
    {
        User::factory()->create([
            'email' => 'disabled@example.com',
            'status' => UserStatus::Disabled,
        ]);
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-disabled',
            'email' => 'disabled@example.com',
            'verified_email' => true,
        ]));

        $this->get('/auth/google/callback')
            ->assertRedirect('http://localhost:3000/login?socialError=google');

        $this->assertGuest();
    }

    public function test_redirect_keeps_only_internal_return_path(): void
    {
        config([
            'services.google.client_id' => 'client-id',
            'services.google.client_secret' => 'client-secret',
        ]);
        Socialite::fake('google');

        $this->get('/auth/google/redirect?next=https://evil.example')
            ->assertRedirect()
            ->assertSessionHas('social_login_next', '/dashboard');
    }

    public function test_redirect_reports_missing_google_configuration(): void
    {
        config(['services.google.client_id' => null, 'services.google.client_secret' => null]);

        $this->get('/auth/google/redirect')
            ->assertRedirect('http://localhost:3000/login?socialError=google-config');
    }
}
