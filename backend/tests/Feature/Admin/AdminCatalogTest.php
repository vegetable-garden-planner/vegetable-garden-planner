<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\Crop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_admin_login(): void
    {
        $this->get('/admin/catalog')->assertRedirect('/admin/login');
    }

    public function test_member_cannot_access_the_catalog(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/admin/catalog')
            ->assertForbidden();
    }

    public function test_admin_sees_real_crop_and_source_data(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $crop = Crop::query()->with('source')->firstOrFail();

        $this->actingAs($admin)
            ->get('/admin/catalog')
            ->assertOk()
            ->assertSee('작물 기준정보를 점검해요')
            ->assertSee($crop->name)
            ->assertSee($crop->id)
            ->assertSee($crop->source->organization);
    }
}
