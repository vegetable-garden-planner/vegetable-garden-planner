<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_spa_can_receive_a_csrf_cookie(): void
    {
        $this->withHeader('Origin', 'http://localhost:3000')
            ->get('/sanctum/csrf-cookie')
            ->assertNoContent()
            ->assertCookie('XSRF-TOKEN');
    }

    public function test_api_guest_receives_json_even_without_accept_header(): void
    {
        $this->get('/api/v1/layouts')
            ->assertUnauthorized()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_user_can_register_and_start_a_session(): void
    {
        $response = $this->statefulPost('/api/v1/auth/register', [
            'email' => '  GARDENER@Example.com ',
            'nickname' => '  새싹집사  ',
            'password' => 'garden123',
            'passwordConfirmation' => 'garden123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.email', 'gardener@example.com')
            ->assertJsonPath('data.user.nickname', '새싹집사')
            ->assertJsonPath('data.user.role', UserRole::Member->value)
            ->assertJsonMissingPath('data.user.password');

        $user = User::query()->sole();

        $this->assertTrue(Str::isUuid($user->id, version: 7));
        $this->assertTrue(Hash::check('garden123', $user->password));
        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertAuthenticatedAs($user);
    }

    public function test_registration_rejects_invalid_and_unknown_fields(): void
    {
        $response = $this->statefulPost('/api/v1/auth/register', [
            'email' => 'invalid-email',
            'nickname' => '한',
            'password' => 'onlyletters',
            'passwordConfirmation' => 'different123',
            'role' => 'admin',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonValidationErrors([
                'email',
                'nickname',
                'password',
                'passwordConfirmation',
                'role',
            ], 'error.fields');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_duplicate_email_returns_conflict_without_creating_a_user(): void
    {
        User::factory()->create(['email' => 'gardener@example.com']);

        $response = $this->statefulPost('/api/v1/auth/register', [
            'email' => 'GARDENER@example.com',
            'nickname' => '다른집사',
            'password' => 'garden123',
            'passwordConfirmation' => 'garden123',
        ]);

        $response
            ->assertConflict()
            ->assertExactJson([
                'error' => [
                    'code' => 'EMAIL_ALREADY_REGISTERED',
                    'message' => '이미 가입된 이메일입니다.',
                ],
            ]);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_active_user_can_login_with_normalized_email(): void
    {
        $user = User::factory()->create([
            'email' => 'gardener@example.com',
            'password' => 'garden123',
        ]);

        $this->statefulPost('/api/v1/auth/login', [
            'email' => ' GARDENER@example.com ',
            'password' => 'garden123',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id);

        $this->assertAuthenticatedAs($user);
    }

    public function test_wrong_password_and_disabled_account_are_rejected(): void
    {
        User::factory()->create([
            'email' => 'gardener@example.com',
            'password' => 'garden123',
        ]);
        User::factory()->create([
            'email' => 'disabled@example.com',
            'password' => 'garden123',
            'status' => UserStatus::Disabled,
        ]);

        $this->statefulPost('/api/v1/auth/login', [
            'email' => 'gardener@example.com',
            'password' => 'wrong-password',
        ])->assertUnauthorized()->assertJsonPath('error.code', 'UNAUTHENTICATED');

        $this->statefulPost('/api/v1/auth/login', [
            'email' => 'disabled@example.com',
            'password' => 'garden123',
        ])->assertUnauthorized()->assertJsonPath('error.code', 'UNAUTHENTICATED');

        $this->assertGuest();
    }

    public function test_authenticated_user_can_read_profile_and_logout(): void
    {
        $user = User::factory()->create(['password' => 'garden123']);

        $this->statefulPost('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'garden123',
        ])->assertOk();

        $this->withHeader('Origin', 'http://localhost:3000')
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.nickname', $user->nickname);

        $this->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/v1/auth/logout')
            ->assertNoContent();

        $this->assertGuest('web');
    }

    public function test_guest_cannot_read_profile_or_logout(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized()
            ->assertExactJson([
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => '로그인이 필요합니다.',
                ],
            ]);

        $this->statefulPost('/api/v1/auth/logout')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function statefulPost(string $uri, array $data = []): TestResponse
    {
        return $this->withHeader('Origin', 'http://localhost:3000')->postJson($uri, $data);
    }
}
