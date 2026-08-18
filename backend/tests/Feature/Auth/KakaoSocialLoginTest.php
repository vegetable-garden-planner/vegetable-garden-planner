<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class KakaoSocialLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_redirect_stores_state_and_safe_return_path(): void
    {
        config([
            'services.kakao.rest_api_key' => 'kakao-client-id',
            'services.kakao.redirect' => 'http://localhost:3000/auth/kakao/callback',
        ]);

        $response = $this->get('/auth/kakao/redirect?next=%2Fspaces');

        $response->assertRedirect()
            ->assertSessionHas('social_login_kakao_next', '/spaces')
            ->assertSessionHas('social_login_kakao_state', fn (mixed $state): bool => is_string($state) && strlen($state) === 40);

        $location = (string) $response->headers->get('Location');
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);
        $this->assertSame('https://kauth.kakao.com/oauth/authorize', strtok($location, '?'));
        $this->assertSame('code', $query['response_type'] ?? null);
        $this->assertSame('kakao-client-id', $query['client_id'] ?? null);
        $this->assertSame('http://localhost:3000/auth/kakao/callback', $query['redirect_uri'] ?? null);
        $this->assertSame('profile_nickname,account_email', $query['scope'] ?? null);
        $this->assertIsString($query['state'] ?? null);
    }

    public function test_redirect_rejects_external_return_path_and_reports_missing_configuration(): void
    {
        config(['services.kakao.rest_api_key' => 'kakao-client-id']);

        $this->get('/auth/kakao/redirect?next=https://evil.example')
            ->assertSessionHas('social_login_kakao_next', '/dashboard');

        config(['services.kakao.rest_api_key' => null]);
        $this->get('/auth/kakao/redirect')
            ->assertRedirect('http://localhost:3000/login?socialError=kakao-config');
    }

    public function test_callback_creates_account_and_starts_session(): void
    {
        $this->fakeKakao([
            'id' => 123456789,
            'kakao_account' => [
                'email' => 'garden.kakao@example.com',
                'is_email_valid' => true,
                'is_email_verified' => true,
                'profile' => ['nickname' => '카카오 새싹'],
            ],
        ]);

        $this->withSession([
            'social_login_kakao_state' => 'valid-state',
            'social_login_kakao_next' => '/seasons',
        ])->get('/auth/kakao/callback?code=authorize-code&state=valid-state')
            ->assertRedirect('http://localhost:3000/seasons');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'garden.kakao@example.com',
            'nickname' => '카카오 새싹',
        ]);
        $this->assertNotNull(User::query()->where('email', 'garden.kakao@example.com')->value('email_verified_at'));
        $this->assertDatabaseHas('social_accounts', [
            'provider' => 'kakao',
            'provider_user_id' => '123456789',
        ]);
        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://kauth.kakao.com/oauth/token'
            && $request['code'] === 'authorize-code');
        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://kapi.kakao.com/v2/user/me'
            && $request->hasHeader('Authorization', 'Bearer kakao-access-token'));
    }

    public function test_verified_email_links_existing_account_without_duplication(): void
    {
        $existing = User::factory()->create(['email' => 'member@example.com']);
        $this->fakeKakao([
            'id' => 987654321,
            'kakao_account' => [
                'email' => 'member@example.com',
                'is_email_valid' => true,
                'is_email_verified' => true,
                'profile' => ['nickname' => '다른 닉네임'],
            ],
        ]);

        $this->withSession(['social_login_kakao_state' => 'valid-state'])
            ->get('/auth/kakao/callback?code=authorize-code&state=valid-state')
            ->assertRedirect('http://localhost:3000/dashboard');

        $this->assertAuthenticatedAs($existing);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('social_accounts', [
            'user_id' => $existing->id,
            'provider' => 'kakao',
        ]);
    }

    public function test_callback_rejects_invalid_state_without_contacting_kakao(): void
    {
        Http::fake();

        $this->withSession(['social_login_kakao_state' => 'expected-state'])
            ->get('/auth/kakao/callback?code=authorize-code&state=other-state')
            ->assertRedirect('http://localhost:3000/login?socialError=kakao');

        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
        Http::assertNothingSent();
    }

    public function test_callback_rejects_missing_or_unverified_email_and_disabled_account(): void
    {
        $this->fakeKakao([
            'id' => 100,
            'kakao_account' => [
                'email' => 'unverified@example.com',
                'is_email_valid' => true,
                'is_email_verified' => false,
                'profile' => ['nickname' => '미확인'],
            ],
        ]);
        $this->withSession(['social_login_kakao_state' => 'state-one'])
            ->get('/auth/kakao/callback?code=authorize-code&state=state-one')
            ->assertRedirect('http://localhost:3000/login?socialError=kakao');
        $this->assertDatabaseCount('users', 0);

        User::factory()->create([
            'email' => 'disabled@example.com',
            'status' => UserStatus::Disabled,
        ]);
        $this->fakeKakao([
            'id' => 200,
            'kakao_account' => [
                'email' => 'disabled@example.com',
                'is_email_valid' => true,
                'is_email_verified' => true,
                'profile' => ['nickname' => '비활성'],
            ],
        ]);
        $this->withSession(['social_login_kakao_state' => 'state-two'])
            ->get('/auth/kakao/callback?code=authorize-code&state=state-two')
            ->assertRedirect('http://localhost:3000/login?socialError=kakao');
        $this->assertGuest();
    }

    /** @param array<string, mixed> $profile */
    private function fakeKakao(array $profile): void
    {
        config([
            'services.kakao.rest_api_key' => 'kakao-client-id',
            'services.kakao.client_secret' => 'kakao-client-secret',
            'services.kakao.redirect' => 'http://localhost:3000/auth/kakao/callback',
        ]);
        Http::fake([
            'https://kauth.kakao.com/oauth/token' => Http::response(['access_token' => 'kakao-access-token']),
            'https://kapi.kakao.com/v2/user/me' => Http::response($profile),
        ]);
    }
}
