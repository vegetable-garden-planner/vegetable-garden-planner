<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\CultivationRecordType;
use App\Enums\CultivationTaskStatus;
use App\Enums\UserRole;
use App\Models\CultivationRecord;
use App\Models\CultivationTask;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_cannot_open_another_member_detail(): void
    {
        $target = User::factory()->create();

        $this->actingAs(User::factory()->create())
            ->get("/admin/users/{$target->id}")
            ->assertForbidden();
    }

    public function test_admin_sees_member_spaces_seasons_and_crop_placements(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $member = User::factory()->create(['nickname' => '텃밭러']);
        $space = GrowingSpace::factory()->for($member, 'owner')->create([
            'name' => '옥상 텃밭',
            'width_cm' => 200,
            'length_cm' => 300,
        ]);
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create(['name' => '봄 감자']);

        GardenLayout::create([
            'growing_season_id' => $season->id,
            'growing_space_id' => $space->id,
            'space_width_cm' => 200,
            'space_length_cm' => 300,
            'cell_size_cm' => 50,
            'columns' => 4,
            'rows' => 6,
        ])->placements()->createMany([
            ['cell_index' => 0, 'crop_id' => 'potato'],
            ['cell_index' => 1, 'crop_id' => 'potato'],
        ]);

        CultivationTask::factory()->for($season, 'growingSeason')
            ->create(['status' => CultivationTaskStatus::Completed]);
        CultivationTask::factory()->for($season, 'growingSeason')->create();
        CultivationRecord::factory()->for($season, 'growingSeason')->create([
            'type' => CultivationRecordType::Harvest,
            'quantity' => 3.5,
            'unit' => 'kg',
        ]);

        $this->actingAs($admin)
            ->get("/admin/users/{$member->id}")
            ->assertOk()
            ->assertSee('텃밭러 회원의 재배 현황')
            ->assertSee('옥상 텃밭')
            ->assertSee('마당·텃밭 · 200×300cm')
            ->assertSee('봄 감자')
            ->assertSee('감자 2포기')
            ->assertSee('4×6칸 중 2칸 사용')
            ->assertSee('1 / 2건 완료')
            ->assertSee('3.5kg');
    }

    public function test_admin_sees_empty_detail_for_member_without_spaces(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $member = User::factory()->create();

        $this->actingAs($admin)
            ->get("/admin/users/{$member->id}")
            ->assertOk()
            ->assertSee('이 회원은 아직 재배 공간을 만들지 않았습니다.')
            ->assertSee('아직 남긴 기록이 없습니다');
    }
}
