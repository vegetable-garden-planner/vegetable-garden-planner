<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Tasks;

use App\Enums\GrowingSpaceType;
use App\Models\CultivationTask;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CultivationTaskApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-04-10 12:00:00 Asia/Seoul');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_guest_cannot_access_task_endpoints(): void
    {
        $season = GrowingSeason::factory()->create();
        $task = CultivationTask::factory()->for($season, 'growingSeason')->create();

        $this->getJson('/api/v1/tasks')->assertUnauthorized();
        $this->getJson("/api/v1/seasons/{$season->id}/tasks")->assertUnauthorized();
        $this->postJson("/api/v1/seasons/{$season->id}/tasks/generate")->assertUnauthorized();
        $this->patchJson("/api/v1/tasks/{$task->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/v1/tasks/{$task->id}")->assertUnauthorized();
        $this->deleteJson("/api/v1/seasons/{$season->id}/tasks", [])->assertUnauthorized();
    }

    public function test_owner_can_generate_unique_crop_tasks_and_list_only_owned_tasks(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();
        $this->createLayout($owner, $space, $season, [
            ['cellIndex' => 0, 'cropId' => 'lettuce'],
            ['cellIndex' => 1, 'cropId' => 'lettuce'],
            ['cellIndex' => 2, 'cropId' => 'carrot'],
        ]);

        $response = $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertCreated()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0.dueDate', '2026-04-01')
            ->assertJsonPath('data.0.version', 1)
            ->assertJsonPath('data.2.dueDate', '2026-05-01');

        $ids = $response->json('data.*.id');
        $this->assertCount(4, array_unique($ids));
        foreach ($ids as $id) {
            $this->assertTrue(Str::isUuid($id, version: 7));
        }
        $this->assertSame(['carrot', 'lettuce'], CultivationTask::query()->pluck('crop_id')->unique()->sort()->values()->all());

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertCreated()
            ->assertJsonCount(4, 'data');
        foreach ($ids as $id) {
            $this->assertDatabaseMissing('cultivation_tasks', ['id' => $id]);
        }

        [$other, , $otherSeason] = $this->ownedSeason();
        CultivationTask::factory()->for($otherSeason, 'growingSeason')->create();

        $this->actingAs($owner)
            ->getJson('/api/v1/tasks?perPage=100&status=pending')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('meta.total', 4);
        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}/tasks?perPage=100")
            ->assertOk()
            ->assertJsonCount(4, 'data');
        $this->actingAs($other)
            ->getJson("/api/v1/seasons/{$season->id}/tasks")
            ->assertForbidden();
    }

    public function test_generation_requires_current_layout_and_keeps_existing_tasks_on_failure(): void
    {
        [$owner, $space, $season] = $this->ownedSeason([
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-31',
        ]);
        $existing = CultivationTask::factory()->for($season, 'growingSeason')->create([
            'due_date' => '2026-08-15',
            'title' => '기존 일정',
        ]);

        $this->actingAs($owner)
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'PRECONDITION_REQUIRED');

        $this->createLayout($owner, $space, $season, [['cellIndex' => 0, 'cropId' => 'lettuce']]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertConflict()
            ->assertJsonPath('error.code', 'CROP_PERIOD_OUTSIDE_SEASON');

        $this->assertDatabaseCount('cultivation_tasks', 1);
        $this->assertDatabaseHas('cultivation_tasks', ['id' => $existing->id, 'title' => '기존 일정']);
    }

    public function test_generation_rejects_missing_or_empty_layout_without_side_effects(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertConflict()
            ->assertJsonPath('error.code', 'SEASON_LAYOUT_REQUIRED');

        GardenLayout::query()->create([
            'growing_season_id' => $season->id,
            'growing_space_id' => $space->id,
            'space_width_cm' => $space->width_cm,
            'space_length_cm' => $space->length_cm,
            'cell_size_cm' => 25,
            'columns' => intdiv($space->width_cm, 25),
            'rows' => intdiv($space->length_cm, 25),
            'version' => 1,
        ]);
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertConflict()
            ->assertJsonPath('error.code', 'LAYOUT_HAS_NO_CROPS');

        $this->assertDatabaseCount('cultivation_tasks', 0);
    }

    public function test_generation_finds_next_year_dates_for_a_season_across_year_end(): void
    {
        [$owner, $space, $season] = $this->ownedSeason([
            'start_date' => '2026-11-01',
            'end_date' => '2027-06-30',
        ]);
        $this->createLayout($owner, $space, $season, [['cellIndex' => 0, 'cropId' => 'lettuce']]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertCreated()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.dueDate', '2027-04-01')
            ->assertJsonPath('data.1.dueDate', '2027-05-01');
    }

    public function test_container_season_generates_tasks_from_featured_crop_without_layout(): void
    {
        [$owner, , $season] = $this->ownedSeason([
            'start_date' => '2026-04-01',
            'end_date' => '2026-06-30',
            'featured_crop_id' => 'lettuce',
        ], ['type' => GrowingSpaceType::Balcony]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertCreated()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.cropId', 'lettuce');

        $this->assertDatabaseCount('garden_layouts', 0);
        $this->assertDatabaseCount('cultivation_tasks', 2);
    }

    public function test_container_season_with_placements_generates_tasks_for_every_placed_crop(): void
    {
        [$owner, $space, $season] = $this->ownedSeason([
            'start_date' => '2026-04-01',
            'end_date' => '2026-06-30',
            'featured_crop_id' => 'lettuce',
        ], ['type' => GrowingSpaceType::Balcony]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson("/api/v1/seasons/{$season->id}/container-placements", [
                'placements' => [
                    ['spaceId' => $space->id, 'cropId' => 'lettuce', 'quantity' => 2],
                    ['spaceId' => $space->id, 'cropId' => 'spinach', 'quantity' => 3],
                ],
            ])
            ->assertOk()
            ->assertHeader('ETag', '"2"');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->postJson("/api/v1/seasons/{$season->id}/tasks/generate")
            ->assertCreated();

        $this->assertSame(
            ['lettuce', 'spinach'],
            CultivationTask::query()->pluck('crop_id')->unique()->sort()->values()->all(),
        );
    }

    public function test_owner_can_update_completion_and_return_task_to_pending(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $task = CultivationTask::factory()->for($season, 'growingSeason')->create();
        $url = "/api/v1/tasks/{$task->id}";

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson($url, [
                'title' => '  물 주기  ',
                'dueDate' => '2026-06-01',
                'notes' => '  충분히  ',
                'status' => 'completed',
            ])
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.title', '물 주기')
            ->assertJsonPath('data.notes', '충분히')
            ->assertJsonPath('data.completedAt', '2026-04-10T03:00:00.000000Z')
            ->assertJsonPath('data.version', 2);

        $completedAt = $task->fresh()->completed_at?->toISOString();
        CarbonImmutable::setTestNow('2026-04-11 12:00:00 Asia/Seoul');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->patchJson($url, ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('data.completedAt', $completedAt);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"3"')
            ->patchJson($url, ['status' => 'pending'])
            ->assertOk()
            ->assertJsonPath('data.completedAt', null)
            ->assertJsonPath('data.version', 4);
    }

    public function test_update_rejects_invalid_input_stale_version_and_other_owner_without_side_effects(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $other = User::factory()->create();
        $task = CultivationTask::factory()->for($season, 'growingSeason')->create(['title' => '원본']);
        $url = "/api/v1/tasks/{$task->id}";

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson($url, ['dueDate' => '2027-01-01', 'unknown' => true])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['dueDate', 'unknown'], 'error.fields');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"9"')
            ->patchJson($url, ['title' => '변경'])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');
        $this->actingAs($other)
            ->withHeader('If-Match', '"1"')
            ->patchJson($url, ['title' => '침범'])
            ->assertForbidden();

        $this->assertDatabaseHas('cultivation_tasks', [
            'id' => $task->id,
            'title' => '원본',
            'version' => 1,
        ]);
    }

    public function test_individual_and_bulk_delete_require_exact_current_versions(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $first = CultivationTask::factory()->for($season, 'growingSeason')->create();
        $second = CultivationTask::factory()->for($season, 'growingSeason')->create(['version' => 2]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->deleteJson("/api/v1/tasks/{$first->id}")
            ->assertStatus(412);
        $this->assertDatabaseHas('cultivation_tasks', ['id' => $first->id]);

        $bulkUrl = "/api/v1/seasons/{$season->id}/tasks";
        $this->actingAs($owner)
            ->deleteJson($bulkUrl, ['tasks' => [
                ['id' => $first->id, 'version' => 1],
                ['id' => $second->id, 'version' => 1],
            ]])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');
        $this->assertDatabaseCount('cultivation_tasks', 2);

        $this->actingAs($owner)
            ->deleteJson($bulkUrl, ['tasks' => [
                ['id' => $first->id, 'version' => 1],
                ['id' => $second->id, 'version' => 2],
            ]])
            ->assertNoContent();
        $this->assertDatabaseCount('cultivation_tasks', 0);
    }

    public function test_other_owner_cannot_bulk_delete_tasks(): void
    {
        [, , $season] = $this->ownedSeason();
        $task = CultivationTask::factory()->for($season, 'growingSeason')->create();

        $this->actingAs(User::factory()->create())
            ->deleteJson("/api/v1/seasons/{$season->id}/tasks", ['tasks' => [
                ['id' => $task->id, 'version' => 1],
            ]])
            ->assertForbidden();

        $this->assertDatabaseHas('cultivation_tasks', ['id' => $task->id]);
    }

    public function test_season_with_tasks_cannot_be_deleted_until_tasks_are_removed(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        CultivationTask::factory()->for($season, 'growingSeason')->create();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/seasons/{$season->id}")
            ->assertConflict()
            ->assertJsonPath('error.code', 'SEASON_HAS_TASKS');

        $this->assertDatabaseHas('growing_seasons', ['id' => $season->id]);
    }

    /** @return array{User, GrowingSpace, GrowingSeason} */
    private function ownedSeason(array $seasonAttributes = [], array $spaceAttributes = []): array
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create($spaceAttributes);
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create($seasonAttributes);

        return [$owner, $space, $season];
    }

    /** @param list<array{cellIndex: int, cropId: string}> $placements */
    private function createLayout(
        User $owner,
        GrowingSpace $space,
        GrowingSeason $season,
        array $placements,
    ): void {
        $this->actingAs($owner)->putJson("/api/v1/seasons/{$season->id}/layout", [
            'spaceWidthCm' => $space->width_cm,
            'spaceLengthCm' => $space->length_cm,
            'cellSizeCm' => 25,
            'placements' => $placements,
        ])->assertCreated();
    }
}
