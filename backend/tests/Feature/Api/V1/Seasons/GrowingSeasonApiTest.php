<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Seasons;

use App\Enums\GrowingSeasonStatus;
use App\Enums\GrowingSpaceType;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class GrowingSeasonApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-08-10 12:00:00 Asia/Seoul');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_guest_cannot_access_season_endpoints(): void
    {
        $this->getJson('/api/v1/seasons')->assertUnauthorized();
        $this->postJson('/api/v1/seasons', [])->assertUnauthorized();
    }

    public function test_owner_can_create_an_active_season(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();

        $response = $this->actingAs($user)->postJson('/api/v1/seasons', [
            ...$this->validPayload($space),
            'name' => '  여름 채소  ',
            'notes' => '  첫 재배  ',
            'featuredCropId' => 'lettuce',
        ]);

        $response
            ->assertCreated()
            ->assertHeader('ETag', '"1"')
            ->assertJsonPath('data.spaceId', $space->id)
            ->assertJsonPath('data.name', '여름 채소')
            ->assertJsonPath('data.status', GrowingSeasonStatus::Active->value)
            ->assertJsonPath('data.featuredCropId', 'lettuce')
            ->assertJsonPath('data.version', 1);

        $season = GrowingSeason::query()->sole();

        $this->assertTrue(Str::isUuid($season->id, version: 7));
        $this->assertSame($space->id, $season->growing_space_id);
    }

    public function test_create_rejects_invalid_dates_duration_and_unknown_fields(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();

        $this->actingAs($user)->postJson('/api/v1/seasons', [
            'spaceId' => $space->id,
            'name' => '한',
            'startDate' => '2026-02-30',
            'endDate' => '2026-01-01',
            'notes' => '',
            'status' => 'active',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'startDate', 'status'], 'error.fields');

        $this->actingAs($user)->postJson('/api/v1/seasons', [
            ...$this->validPayload($space),
            'startDate' => '2026-01-01',
            'endDate' => '2028-01-02',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['endDate'], 'error.fields');

        $this->assertDatabaseCount('growing_seasons', 0);
    }

    public function test_create_rejects_reversed_period(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();

        $this->actingAs($user)->postJson('/api/v1/seasons', [
            ...$this->validPayload($space),
            'startDate' => '2026-09-01',
            'endDate' => '2026-08-31',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['endDate'], 'error.fields');
    }

    public function test_container_season_does_not_require_a_featured_crop(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create([
            'type' => GrowingSpaceType::Indoor,
        ]);

        $this->actingAs($user)
            ->postJson('/api/v1/seasons', $this->validPayload($space))
            ->assertCreated()
            ->assertJsonPath('data.featuredCropId', null);

        $this->assertDatabaseCount('growing_seasons', 1);
    }

    public function test_container_season_requires_a_crop_supported_by_its_space(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create([
            'type' => GrowingSpaceType::Indoor,
        ]);

        $this->actingAs($user)
            ->postJson('/api/v1/seasons', [
                ...$this->validPayload($space),
                'featuredCropId' => 'tomato',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['featuredCropId'], 'error.fields');

        $this->actingAs($user)
            ->postJson('/api/v1/seasons', [
                ...$this->validPayload($space),
                'featuredCropId' => 'african-violet',
            ])
            ->assertCreated()
            ->assertJsonPath('data.featuredCropId', 'african-violet');

        $this->assertDatabaseCount('growing_seasons', 1);
    }

    public function test_user_cannot_create_season_in_another_users_space(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();

        $this->actingAs($other)
            ->postJson('/api/v1/seasons', $this->validPayload($space))
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');

        $payload = $this->validPayload($space);
        $payload['spaceId'] = Str::uuid()->toString();

        $this->actingAs($other)
            ->postJson('/api/v1/seasons', $payload)
            ->assertNotFound();
    }

    public function test_create_rejects_malformed_space_id_as_validation_error(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();

        $this->actingAs($user)->postJson('/api/v1/seasons', [
            ...$this->validPayload($space),
            'spaceId' => 'not-a-uuid',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['spaceId'], 'error.fields');
    }

    public function test_same_space_cannot_have_inclusive_overlapping_periods(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();
        GrowingSeason::factory()->for($space, 'growingSpace')->create([
            'start_date' => '2026-06-01',
            'end_date' => '2026-08-10',
        ]);

        $this->actingAs($user)->postJson('/api/v1/seasons', [
            ...$this->validPayload($space),
            'startDate' => '2026-08-10',
            'endDate' => '2026-10-01',
        ])
            ->assertConflict()
            ->assertJsonPath('error.code', 'SEASON_PERIOD_OVERLAP');

        $this->assertDatabaseCount('growing_seasons', 1);
    }

    public function test_list_contains_only_owned_seasons_and_filters_computed_status(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();
        $otherSpace = GrowingSpace::factory()->create();

        GrowingSeason::factory()->for($space, 'growingSpace')->create([
            'start_date' => '2026-01-01',
            'end_date' => '2026-01-31',
        ]);
        $active = GrowingSeason::factory()->for($space, 'growingSpace')->create([
            'start_date' => '2026-08-10',
            'end_date' => '2026-08-10',
        ]);
        GrowingSeason::factory()->for($space, 'growingSpace')->create([
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-30',
        ]);
        GrowingSeason::factory()->for($otherSpace, 'growingSpace')->create([
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-31',
        ]);

        $this->actingAs($user)
            ->getJson("/api/v1/seasons?spaceId={$space->id}&status=active")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $active->id)
            ->assertJsonPath('data.0.status', GrowingSeasonStatus::Active->value)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_owner_can_read_season_but_other_user_is_forbidden(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create(['version' => 4]);

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}")
            ->assertOk()
            ->assertHeader('ETag', '"4"');

        $this->actingAs($other)
            ->getJson("/api/v1/seasons/{$season->id}")
            ->assertForbidden();
    }

    public function test_owner_can_update_period_and_move_season_to_another_owned_space(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();
        $targetSpace = GrowingSpace::factory()->for($user, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();

        $this->actingAs($user)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/seasons/{$season->id}", [
                'spaceId' => $targetSpace->id,
                'name' => '옮긴 시즌',
                'startDate' => '2026-04-01',
                'endDate' => '2026-09-30',
            ])
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.spaceId', $targetSpace->id)
            ->assertJsonPath('data.version', 2);

        $this->assertDatabaseHas('growing_seasons', [
            'id' => $season->id,
            'growing_space_id' => $targetSpace->id,
            'version' => 2,
        ]);
    }

    public function test_update_rejects_overlap_foreign_space_and_stale_version_without_side_effects(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $foreignSpace = GrowingSpace::factory()->for($other, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create([
            'start_date' => '2026-01-01',
            'end_date' => '2026-02-01',
        ]);
        GrowingSeason::factory()->for($space, 'growingSpace')->create([
            'start_date' => '2026-03-01',
            'end_date' => '2026-04-01',
        ]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/seasons/{$season->id}", [
                'startDate' => '2026-03-15',
                'endDate' => '2026-04-15',
            ])
            ->assertConflict()
            ->assertJsonPath('error.code', 'SEASON_PERIOD_OVERLAP');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/seasons/{$season->id}", ['spaceId' => $foreignSpace->id])
            ->assertForbidden();

        $season->forceFill(['version' => 2])->save();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/seasons/{$season->id}", [
                'name' => '오래된 수정',
                'startDate' => '2026-03-15',
                'endDate' => '2026-04-15',
            ])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');

        $fresh = $season->fresh();
        $this->assertSame('2026-01-01', $fresh->start_date->toDateString());
        $this->assertSame($space->id, $fresh->growing_space_id);
        $this->assertNotSame('오래된 수정', $fresh->name);
    }

    public function test_owner_can_delete_current_season_version(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create(['version' => 2]);

        $this->actingAs($user)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/seasons/{$season->id}")
            ->assertStatus(412);

        $this->actingAs($user)
            ->withHeader('If-Match', '"2"')
            ->deleteJson("/api/v1/seasons/{$season->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('growing_seasons', ['id' => $season->id]);
    }

    public function test_space_with_season_cannot_be_deleted(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();
        GrowingSeason::factory()->for($space, 'growingSpace')->create();

        $this->actingAs($user)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/spaces/{$space->id}")
            ->assertConflict()
            ->assertJsonPath('error.code', 'SPACE_HAS_SEASONS');

        $this->assertDatabaseHas('growing_spaces', ['id' => $space->id]);
        $this->assertDatabaseCount('growing_seasons', 1);
    }

    /**
     * @return array<string, int|string>
     */
    private function validPayload(GrowingSpace $space): array
    {
        return [
            'spaceId' => $space->id,
            'name' => '여름 재배',
            'startDate' => '2026-08-01',
            'endDate' => '2026-08-31',
            'notes' => '',
        ];
    }
}
