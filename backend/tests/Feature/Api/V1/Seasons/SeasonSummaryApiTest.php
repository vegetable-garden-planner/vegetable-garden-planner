<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Seasons;

use App\Enums\CultivationRecordType;
use App\Enums\CultivationTaskStatus;
use App\Models\CultivationRecord;
use App\Models\CultivationTask;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeasonSummaryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_summary_endpoint(): void
    {
        $season = GrowingSeason::factory()->create();

        $this->getJson("/api/v1/seasons/{$season->id}/summary")->assertUnauthorized();
    }

    public function test_owner_can_read_summary_but_other_user_is_forbidden(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}/summary")
            ->assertOk();

        $this->actingAs($other)
            ->getJson("/api/v1/seasons/{$season->id}/summary")
            ->assertForbidden();
    }

    public function test_missing_season_is_not_found(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/seasons/'.fake()->uuid().'/summary')
            ->assertNotFound();
    }

    public function test_season_without_records_or_tasks_returns_zero_counts_and_null_rate(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();

        $this->actingAs($user)
            ->getJson("/api/v1/seasons/{$season->id}/summary")
            ->assertOk()
            ->assertJsonPath('data.seasonId', $season->id)
            ->assertJsonPath('data.recordCounts.work', 0)
            ->assertJsonPath('data.recordCounts.growth', 0)
            ->assertJsonPath('data.recordCounts.harvest', 0)
            ->assertJsonPath('data.recordCounts.watering', 0)
            ->assertJsonPath('data.harvestTotals', [])
            ->assertJsonPath('data.taskCompletion.total', 0)
            ->assertJsonPath('data.taskCompletion.completed', 0)
            ->assertJsonPath('data.taskCompletion.rate', null);
    }

    public function test_summary_counts_records_by_type_groups_harvest_by_unit_and_computes_task_rate(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();
        $otherSeason = GrowingSeason::factory()->for($space, 'growingSpace')->create([
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-30',
        ]);

        CultivationRecord::factory()->for($season, 'growingSeason')->create(['type' => CultivationRecordType::Work]);
        CultivationRecord::factory()->for($season, 'growingSeason')->create(['type' => CultivationRecordType::Work]);
        CultivationRecord::factory()->for($season, 'growingSeason')->create(['type' => CultivationRecordType::Growth]);
        CultivationRecord::factory()->for($season, 'growingSeason')->create([
            'type' => CultivationRecordType::Harvest,
            'quantity' => '1.500',
            'unit' => 'kg',
        ]);
        CultivationRecord::factory()->for($season, 'growingSeason')->create([
            'type' => CultivationRecordType::Harvest,
            'quantity' => '2.000',
            'unit' => 'kg',
        ]);
        CultivationRecord::factory()->for($season, 'growingSeason')->create([
            'type' => CultivationRecordType::Harvest,
            'quantity' => '3',
            'unit' => '개',
        ]);
        // Belongs to a different season and must not leak into this summary.
        CultivationRecord::factory()->for($otherSeason, 'growingSeason')->create([
            'type' => CultivationRecordType::Harvest,
            'quantity' => '99',
            'unit' => 'kg',
        ]);

        CultivationTask::factory()->for($season, 'growingSeason')->create(['status' => CultivationTaskStatus::Completed]);
        CultivationTask::factory()->for($season, 'growingSeason')->create(['status' => CultivationTaskStatus::Completed]);
        CultivationTask::factory()->for($season, 'growingSeason')->create(['status' => CultivationTaskStatus::Completed]);
        CultivationTask::factory()->for($season, 'growingSeason')->create(['status' => CultivationTaskStatus::Pending]);

        $this->actingAs($user)
            ->getJson("/api/v1/seasons/{$season->id}/summary")
            ->assertOk()
            ->assertJsonPath('data.recordCounts.work', 2)
            ->assertJsonPath('data.recordCounts.growth', 1)
            ->assertJsonPath('data.recordCounts.harvest', 3)
            ->assertJsonPath('data.recordCounts.watering', 0)
            ->assertJsonPath('data.harvestTotals', [
                ['unit' => 'kg', 'quantity' => 3.5],
                ['unit' => '개', 'quantity' => 3],
            ])
            ->assertJsonPath('data.taskCompletion.total', 4)
            ->assertJsonPath('data.taskCompletion.completed', 3)
            ->assertJsonPath('data.taskCompletion.rate', 0.75);
    }
}
