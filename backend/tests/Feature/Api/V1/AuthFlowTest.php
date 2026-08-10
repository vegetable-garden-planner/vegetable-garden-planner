<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    public function test_user_can_register_login_read_session_and_logout(): void
    {
        $origin = ['Origin' => 'http://localhost'];

        $register = $this->withHeaders($origin)->postJson('/api/v1/auth/register', [
            'email' => 'gardener@example.com',
            'nickname' => '초록손',
            'password' => 'garden1234',
            'passwordConfirmation' => 'garden1234',
        ]);

        $register->assertCreated()
            ->assertJsonPath('data.user.email', 'gardener@example.com')
            ->assertJsonPath('data.user.nickname', '초록손');
        $user = User::query()->where('email', 'gardener@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('garden1234', $user->password));

        $this->withHeaders($origin)->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->withHeaders($origin)->postJson('/api/v1/auth/login', [
            'email' => 'gardener@example.com',
            'password' => 'garden1234',
        ])->assertOk();
        $this->withHeaders($origin)->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_duplicate_email_is_rejected(): void
    {
        User::factory()->create(['email' => 'same@example.com']);

        $this->withHeader('Origin', 'http://localhost')->postJson('/api/v1/auth/register', [
            'email' => 'same@example.com',
            'nickname' => '초록손',
            'password' => 'garden1234',
            'passwordConfirmation' => 'garden1234',
        ])->assertConflict()->assertJsonPath('error.code', 'EMAIL_ALREADY_EXISTS');
    }
}
