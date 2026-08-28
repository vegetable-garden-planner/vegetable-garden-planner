<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Watering;

use App\Enums\GrowingSpaceType;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use App\Models\WateringLog;
use App\Models\WateringSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class WateringScheduleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_watering_endpoints(): void
    {
        [, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create();
        $log = WateringLog::factory()->for($schedule, 'wateringSchedule')->create();

        $this->getJson("/api/v1/seasons/{$season->id}/watering-schedules")->assertUnauthorized();
        $this->getJson('/api/v1/watering-schedules')->assertUnauthorized();
        $this->postJson("/api/v1/seasons/{$season->id}/watering-schedules", [])->assertUnauthorized();
        $this->getJson("/api/v1/watering-schedules/{$schedule->id}")->assertUnauthorized();
        $this->patchJson("/api/v1/watering-schedules/{$schedule->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/v1/watering-schedules/{$schedule->id}")->assertUnauthorized();
        $this->postJson("/api/v1/watering-schedules/{$schedule->id}/complete", [])->assertUnauthorized();
        $this->postJson("/api/v1/watering-schedules/{$schedule->id}/snoozes", [])->assertUnauthorized();
        $this->deleteJson("/api/v1/watering-schedules/{$schedule->id}/logs/{$log->id}")->assertUnauthorized();
    }

    public function test_owner_can_list_only_their_schedules_across_seasons_in_due_order(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $later = WateringSchedule::factory()->for($season, 'growingSeason')->create([
            'next_watering_at' => '2026-05-03T00:00:00Z',
        ]);
        [, , $secondSeason] = $this->ownedSeasonWithLayoutFor($owner);
        $earlier = WateringSchedule::factory()->for($secondSeason, 'growingSeason')->create([
            'next_watering_at' => '2026-05-01T00:00:00Z',
        ]);
        [, , $otherSeason] = $this->ownedSeasonWithLayout();
        WateringSchedule::factory()->for($otherSeason, 'growingSeason')->create([
            'next_watering_at' => '2026-04-01T00:00:00Z',
        ]);

        $this->actingAs($owner)
            ->getJson('/api/v1/watering-schedules?perPage=100')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $earlier->id)
            ->assertJsonPath('data.1.id', $later->id)
            ->assertJsonPath('meta.total', 2);
    }

    public function test_owner_can_create_list_and_show_schedule_for_a_placed_crop(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();

        $response = $this->actingAs($owner)
            ->postJson("/api/v1/seasons/{$season->id}/watering-schedules", $this->validPayload())
            ->assertCreated()
            ->assertHeader('ETag', '"1"')
            ->assertJsonPath('data.seasonId', $season->id)
            ->assertJsonPath('data.cropId', 'lettuce')
            ->assertJsonPath('data.intervalDays', 3)
            ->assertJsonPath('data.nextWateringAt', '2026-05-01T00:00:00.000000Z')
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.version', 1);

        $scheduleId = $response->json('data.id');
        $this->assertIsString($scheduleId);
        $this->assertTrue(Str::isUuid($scheduleId, version: 7));

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}/watering-schedules?perPage=100")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $scheduleId)
            ->assertJsonPath('meta.total', 1);
        $this->actingAs($owner)
            ->getJson("/api/v1/watering-schedules/{$scheduleId}")
            ->assertOk()
            ->assertHeader('ETag', '"1"');
    }

    public function test_owner_can_create_a_schedule_for_a_crop_placed_in_a_container_season(): void
    {
        $owner = User::factory()->create();
        $pot = GrowingSpace::factory()->for($owner, 'owner')->create(['type' => GrowingSpaceType::Balcony]);
        $season = GrowingSeason::factory()->for($pot, 'growingSpace')->create();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson("/api/v1/seasons/{$season->id}/container-placements", [
                'placements' => [['spaceId' => $pot->id, 'cropId' => 'lettuce', 'quantity' => 2]],
            ])
            ->assertOk();

        $this->actingAs($owner)
            ->postJson("/api/v1/seasons/{$season->id}/watering-schedules", $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('data.cropId', 'lettuce');
    }

    public function test_create_rejects_unplaced_duplicate_and_invalid_input_without_side_effects(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $url = "/api/v1/seasons/{$season->id}/watering-schedules";

        $this->actingAs($owner)
            ->postJson($url, [...$this->validPayload(), 'cropId' => 'carrot'])
            ->assertConflict()
            ->assertJsonPath('error.code', 'WATERING_CROP_NOT_PLACED');
        $this->actingAs($owner)->postJson($url, $this->validPayload())->assertCreated();
        $this->actingAs($owner)
            ->postJson($url, $this->validPayload())
            ->assertConflict()
            ->assertJsonPath('error.code', 'WATERING_SCHEDULE_ALREADY_EXISTS');
        $this->actingAs($owner)
            ->postJson($url, [
                ...$this->validPayload(),
                'intervalDays' => 0,
                'nextWateringAt' => '2027-01-01T00:00:00Z',
                'unknown' => true,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['intervalDays', 'nextWateringAt', 'unknown'], 'error.fields');

        $this->assertDatabaseCount('watering_schedules', 1);
    }

    public function test_other_user_cannot_read_or_mutate_schedule(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create();
        $other = User::factory()->create();

        $this->actingAs($other)
            ->getJson("/api/v1/seasons/{$season->id}/watering-schedules")
            ->assertForbidden();
        $this->actingAs($other)
            ->getJson("/api/v1/watering-schedules/{$schedule->id}")
            ->assertForbidden();
        $this->actingAs($other)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/watering-schedules/{$schedule->id}", ['enabled' => false])
            ->assertForbidden();
        $this->actingAs($other)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/watering-schedules/{$schedule->id}/complete", $this->completionPayload())
            ->assertForbidden();

        $this->assertDatabaseHas('watering_schedules', ['id' => $schedule->id, 'version' => 1]);
        $this->assertDatabaseCount('watering_logs', 0);
    }

    public function test_update_requires_fields_and_current_version(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create();
        $url = "/api/v1/watering-schedules/{$schedule->id}";

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson($url, [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['schedule'], 'error.fields');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"9"')
            ->patchJson($url, ['intervalDays' => 5])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson($url, ['intervalDays' => 5, 'enabled' => false])
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.intervalDays', 5)
            ->assertJsonPath('data.enabled', false)
            ->assertJsonPath('data.version', 2);
    }

    public function test_complete_creates_log_and_advances_schedule_from_actual_time(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create();

        $response = $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/watering-schedules/{$schedule->id}/complete", $this->completionPayload())
            ->assertCreated()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.log.userId', $owner->id)
            ->assertJsonPath('data.log.scheduledFor', '2026-05-01T00:00:00.000000Z')
            ->assertJsonPath('data.log.wateredAt', '2026-05-02T00:30:00.000000Z')
            ->assertJsonPath('data.log.amountMl', 750)
            ->assertJsonPath('data.log.memo', '충분히 관수')
            ->assertJsonPath('data.schedule.nextWateringAt', '2026-05-05T00:30:00.000000Z')
            ->assertJsonPath('data.schedule.version', 2);

        $this->assertDatabaseHas('watering_logs', [
            'id' => $response->json('data.log.id'),
            'watering_schedule_id' => $schedule->id,
            'user_id' => $owner->id,
            'amount_ml' => 750,
            'memo' => '충분히 관수',
        ]);
    }

    public function test_complete_rejects_disabled_invalid_and_stale_requests_without_logs(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create(['enabled' => false]);
        $url = "/api/v1/watering-schedules/{$schedule->id}/complete";

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson($url, $this->completionPayload())
            ->assertConflict()
            ->assertJsonPath('error.code', 'WATERING_SCHEDULE_DISABLED');
        $schedule->forceFill(['enabled' => true])->save();
        $this->actingAs($owner)
            ->withHeader('If-Match', '"9"')
            ->postJson($url, $this->completionPayload())
            ->assertStatus(412);
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson($url, ['wateredAt' => '2027-01-01T00:00:00Z', 'amountMl' => 0, 'memo' => null])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['wateredAt', 'amountMl'], 'error.fields');

        $this->assertDatabaseCount('watering_logs', 0);
        $this->assertDatabaseHas('watering_schedules', ['id' => $schedule->id, 'version' => 1]);
    }

    public function test_completion_after_last_interval_disables_schedule(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create([
            'next_watering_at' => '2026-08-30T00:00:00Z',
            'interval_days' => 3,
        ]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/watering-schedules/{$schedule->id}/complete", [
                'wateredAt' => '2026-08-30T09:00:00Z',
                'amountMl' => null,
                'memo' => '',
            ])
            ->assertCreated()
            ->assertJsonPath('data.schedule.enabled', false)
            ->assertJsonPath('data.schedule.nextWateringAt', '2026-09-02T09:00:00.000000Z');
    }

    public function test_snooze_records_original_time_and_requires_a_later_time_in_season(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create();
        $url = "/api/v1/watering-schedules/{$schedule->id}/snoozes";

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson($url, ['snoozedUntil' => '2026-04-30T00:00:00Z'])
            ->assertConflict()
            ->assertJsonPath('error.code', 'WATERING_SNOOZE_NOT_LATER');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson($url, ['snoozedUntil' => '2027-01-01T00:00:00Z'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['snoozedUntil'], 'error.fields');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->postJson($url, ['snoozedUntil' => '2026-05-02T12:00:00+09:00'])
            ->assertCreated()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.snooze.originalAt', '2026-05-01T00:00:00.000000Z')
            ->assertJsonPath('data.snooze.snoozedUntil', '2026-05-02T03:00:00.000000Z')
            ->assertJsonPath('data.schedule.nextWateringAt', '2026-05-02T03:00:00.000000Z');

        $this->assertDatabaseCount('watering_snoozes', 1);
    }

    public function test_only_latest_completion_can_be_reopened(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create(['version' => 3]);
        $older = WateringLog::factory()->for($schedule, 'wateringSchedule')->for($owner)->create([
            'watered_at' => '2026-04-20T00:00:00Z',
        ]);
        $latest = WateringLog::factory()->for($schedule, 'wateringSchedule')->for($owner)->create([
            'scheduled_for' => '2026-05-01T00:00:00Z',
            'watered_at' => '2026-05-02T00:00:00Z',
        ]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"3"')
            ->deleteJson("/api/v1/watering-schedules/{$schedule->id}/logs/{$older->id}")
            ->assertConflict()
            ->assertJsonPath('error.code', 'WATERING_LOG_NOT_LATEST');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"3"')
            ->deleteJson("/api/v1/watering-schedules/{$schedule->id}/logs/{$latest->id}")
            ->assertOk()
            ->assertHeader('ETag', '"4"')
            ->assertJsonPath('data.nextWateringAt', '2026-05-01T00:00:00.000000Z')
            ->assertJsonPath('data.enabled', true);

        $this->assertDatabaseMissing('watering_logs', ['id' => $latest->id]);
        $this->assertDatabaseHas('watering_logs', ['id' => $older->id]);
    }

    public function test_history_is_listed_and_prevents_schedule_or_layout_deletion(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create();
        WateringLog::factory()->for($schedule, 'wateringSchedule')->for($owner)->create();

        $this->actingAs($owner)
            ->getJson("/api/v1/watering-schedules/{$schedule->id}/logs")
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/watering-schedules/{$schedule->id}")
            ->assertConflict()
            ->assertJsonPath('error.code', 'WATERING_SCHEDULE_HAS_HISTORY');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/seasons/{$season->id}/layout")
            ->assertConflict()
            ->assertJsonPath('error.code', 'LAYOUT_HAS_WATERING_SCHEDULES');

        $this->assertDatabaseHas('watering_schedules', ['id' => $schedule->id]);
        $this->assertDatabaseHas('garden_layouts', ['growing_season_id' => $season->id]);
    }

    public function test_layout_cannot_remove_crop_with_schedule_but_can_keep_it(): void
    {
        [$owner, $space, $season] = $this->ownedSeasonWithLayout();
        WateringSchedule::factory()->for($season, 'growingSeason')->create();
        $url = "/api/v1/seasons/{$season->id}/layout";
        $base = [
            'spaceWidthCm' => $space->width_cm,
            'spaceLengthCm' => $space->length_cm,
            'cellSizeCm' => 25,
        ];

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson($url, [...$base, 'placements' => [['cellIndex' => 0, 'cropId' => 'carrot']]])
            ->assertConflict()
            ->assertJsonPath('error.code', 'LAYOUT_CROP_HAS_WATERING_SCHEDULE');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson($url, [...$base, 'placements' => [['cellIndex' => 2, 'cropId' => 'lettuce']]])
            ->assertOk();

        $this->assertDatabaseHas('garden_layout_placements', [
            'growing_season_id' => $season->id,
            'cell_index' => 2,
            'crop_id' => 'lettuce',
        ]);
    }

    public function test_schedule_without_history_can_be_deleted_with_current_version(): void
    {
        [$owner, , $season] = $this->ownedSeasonWithLayout();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create(['version' => 2]);
        $url = "/api/v1/watering-schedules/{$schedule->id}";

        $this->actingAs($owner)->withHeader('If-Match', '"1"')->deleteJson($url)->assertStatus(412);
        $this->actingAs($owner)->withHeader('If-Match', '"2"')->deleteJson($url)->assertNoContent();

        $this->assertDatabaseMissing('watering_schedules', ['id' => $schedule->id]);
    }

    /** @return array{User, GrowingSpace, GrowingSeason} */
    private function ownedSeasonWithLayout(): array
    {
        $owner = User::factory()->create();

        return $this->ownedSeasonWithLayoutFor($owner);
    }

    /** @return array{User, GrowingSpace, GrowingSeason} */
    private function ownedSeasonWithLayoutFor(User $owner): array
    {
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();
        $layout = GardenLayout::query()->create([
            'growing_season_id' => $season->id,
            'growing_space_id' => $space->id,
            'space_width_cm' => $space->width_cm,
            'space_length_cm' => $space->length_cm,
            'cell_size_cm' => 25,
            'columns' => 8,
            'rows' => 12,
            'version' => 1,
        ]);
        $layout->placements()->create(['cell_index' => 0, 'crop_id' => 'lettuce']);

        return [$owner, $space, $season];
    }

    /** @return array<string, mixed> */
    private function validPayload(): array
    {
        return [
            'cropId' => 'lettuce',
            'intervalDays' => 3,
            'nextWateringAt' => '2026-05-01T09:00:00+09:00',
            'enabled' => true,
        ];
    }

    /** @return array<string, mixed> */
    private function completionPayload(): array
    {
        return [
            'wateredAt' => '2026-05-02T09:30:00+09:00',
            'amountMl' => 750,
            'memo' => '  충분히 관수  ',
        ];
    }
}
