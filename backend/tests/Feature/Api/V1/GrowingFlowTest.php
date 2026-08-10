<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GrowingFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_persist_the_core_growing_flow(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $space = $this->postJson('/api/v1/spaces', [
            'name' => '우리집 베란다',
            'type' => 'garden',
            'sunlight' => 'full',
            'widthCm' => 200,
            'lengthCm' => 100,
            'region' => '서울',
            'notes' => '남향',
        ])->assertCreated()->json('data');

        $season = $this->postJson('/api/v1/seasons', [
            'spaceId' => $space['id'],
            'name' => '가을 상추',
            'startDate' => '2026-08-01',
            'endDate' => '2026-10-31',
            'notes' => '',
            'featuredCropId' => 'lettuce',
        ])->assertCreated()->json('data');

        $this->putJson("/api/v1/seasons/{$season['id']}/layout", [
            'spaceWidthCm' => 200,
            'spaceLengthCm' => 100,
            'cellSizeCm' => 25,
            'placements' => [
                ['cellIndex' => 0, 'cropId' => 'lettuce'],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.columns', 8)
            ->assertJsonPath('data.rows', 4);

        $this->putJson("/api/v1/seasons/{$season['id']}/tasks", [
            'tasks' => [[
                'cropId' => 'lettuce',
                'type' => 'harvest',
                'title' => '상추 수확 시작하기',
                'dueDate' => '2026-08-20',
                'notes' => '바깥 잎부터 수확하세요.',
                'status' => 'pending',
            ]],
        ])->assertCreated()->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/spaces')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/seasons')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/layouts')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/tasks')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_user_cannot_read_another_users_space(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $spaceId = $this->postJson('/api/v1/spaces', [
            'name' => '소유자 텃밭',
            'type' => 'garden',
            'sunlight' => 'full',
            'widthCm' => 100,
            'lengthCm' => 100,
            'region' => '서울',
            'notes' => '',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/v1/spaces/{$spaceId}")->assertForbidden();
    }

    public function test_overlapping_seasons_and_parent_deletion_are_blocked(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $space = $this->postJson('/api/v1/spaces', [
            'name' => '겹침 검사 텃밭',
            'type' => 'garden',
            'sunlight' => 'partial',
            'widthCm' => 100,
            'lengthCm' => 100,
            'region' => '부산',
            'notes' => '',
        ])->assertCreated()->json('data');
        $this->postJson('/api/v1/seasons', [
            'spaceId' => $space['id'],
            'name' => '첫 시즌',
            'startDate' => '2026-03-01',
            'endDate' => '2026-05-31',
            'notes' => '',
        ])->assertCreated();

        $this->postJson('/api/v1/seasons', [
            'spaceId' => $space['id'],
            'name' => '겹친 시즌',
            'startDate' => '2026-05-01',
            'endDate' => '2026-06-30',
            'notes' => '',
        ])->assertConflict()->assertJsonPath('error.code', 'SEASON_DATE_OVERLAP');

        $this->deleteJson("/api/v1/spaces/{$space['id']}")
            ->assertConflict()
            ->assertJsonPath('error.code', 'SPACE_HAS_SEASONS');
    }
}
