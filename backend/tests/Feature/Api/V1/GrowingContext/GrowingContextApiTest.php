<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\GrowingContext;

use App\Enums\GrowingSpaceType;
use App\Models\CultivationRecord;
use App\Models\CultivationTask;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\SpaceMemo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GrowingContextApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_growing_context(): void
    {
        $this->getJson('/api/v1/growing-context')->assertUnauthorized();
    }

    public function test_returns_only_the_authenticated_users_data_across_all_sections(): void
    {
        $owner = User::factory()->create();
        $pot = GrowingSpace::factory()->for($owner, 'owner')->create(['type' => GrowingSpaceType::Balcony]);
        $season = GrowingSeason::factory()->for($pot, 'growingSpace')->create();
        $season->containerPlacements()->create([
            'growing_space_id' => $pot->id,
            'crop_id' => 'lettuce',
            'quantity' => 3,
            'position' => ['order' => 0],
        ]);
        CultivationRecord::factory()->for($season, 'growingSeason')->create(['notes' => '새 잎 확인']);
        CultivationTask::factory()->for($season, 'growingSeason')->create(['due_date' => '2026-09-01', 'title' => '물 주기']);
        SpaceMemo::factory()->for($pot, 'growingSpace')->create(['body' => '창가라 잘 자람']);

        $other = User::factory()->create();
        $othersPot = GrowingSpace::factory()->for($other, 'owner')->create(['type' => GrowingSpaceType::Balcony]);
        $othersSeason = GrowingSeason::factory()->for($othersPot, 'growingSpace')->create();
        $othersSeason->containerPlacements()->create([
            'growing_space_id' => $othersPot->id,
            'crop_id' => 'carrot',
            'quantity' => 1,
            'position' => null,
        ]);
        CultivationRecord::factory()->for($othersSeason, 'growingSeason')->create();
        CultivationTask::factory()->for($othersSeason, 'growingSeason')->create();
        SpaceMemo::factory()->for($othersPot, 'growingSpace')->create();

        $response = $this->actingAs($owner)->getJson('/api/v1/growing-context');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data.spaces')
            ->assertJsonPath('data.spaces.0.id', $pot->id)
            ->assertJsonCount(1, 'data.seasons')
            ->assertJsonPath('data.seasons.0.id', $season->id)
            ->assertJsonCount(1, 'data.containerPlacements')
            ->assertJsonPath('data.containerPlacements.0.cropId', 'lettuce')
            ->assertJsonCount(1, 'data.recentRecords')
            ->assertJsonPath('data.recentRecords.0.notes', '새 잎 확인')
            ->assertJsonCount(1, 'data.memos')
            ->assertJsonPath('data.memos.0.body', '창가라 잘 자람')
            ->assertJsonCount(1, 'data.upcomingTasks')
            ->assertJsonPath('data.upcomingTasks.0.title', '물 주기');

        $this->assertArrayHasKey('generatedAt', $response->json('data'));
    }

    public function test_only_returns_pending_tasks_sorted_by_due_date(): void
    {
        $owner = User::factory()->create();
        $pot = GrowingSpace::factory()->for($owner, 'owner')->create(['type' => GrowingSpaceType::Balcony]);
        $season = GrowingSeason::factory()->for($pot, 'growingSpace')->create();
        CultivationTask::factory()->for($season, 'growingSeason')->create(['due_date' => '2026-09-10', 'title' => '나중 일정']);
        CultivationTask::factory()->for($season, 'growingSeason')->create(['due_date' => '2026-09-01', 'title' => '먼저 일정']);
        CultivationTask::factory()->for($season, 'growingSeason')->create(['due_date' => '2026-08-01', 'title' => '완료 일정', 'status' => 'completed']);

        $response = $this->actingAs($owner)->getJson('/api/v1/growing-context');

        $response
            ->assertOk()
            ->assertJsonCount(2, 'data.upcomingTasks')
            ->assertJsonPath('data.upcomingTasks.0.title', '먼저 일정')
            ->assertJsonPath('data.upcomingTasks.1.title', '나중 일정');
    }
}
