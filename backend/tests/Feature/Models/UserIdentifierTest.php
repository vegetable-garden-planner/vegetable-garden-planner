<?php

declare(strict_types=1);

namespace Tests\Feature\Models;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserIdentifierTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_use_the_existing_mysql_auto_increment_identifier(): void
    {
        $user = User::factory()->create();

        $this->assertIsInt($user->id);
        $this->assertGreaterThan(0, $user->id);
    }
}
