<?php

declare(strict_types=1);

namespace Tests\Feature\Models;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class UserIdentifierTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_receive_uuid_version_seven_identifiers(): void
    {
        $user = User::factory()->create();

        $this->assertTrue(Str::isUuid($user->id, version: 7));
    }
}
