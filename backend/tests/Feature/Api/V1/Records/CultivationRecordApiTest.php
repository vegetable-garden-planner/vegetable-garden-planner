<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Records;

use App\Models\CultivationRecord;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CultivationRecordApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_record_endpoints(): void
    {
        $season = GrowingSeason::factory()->create();
        $record = CultivationRecord::factory()->for($season, 'growingSeason')->create();

        $this->getJson("/api/v1/seasons/{$season->id}/records")->assertUnauthorized();
        $this->postJson("/api/v1/seasons/{$season->id}/records", [])->assertUnauthorized();
        $this->patchJson("/api/v1/records/{$record->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/v1/records/{$record->id}")->assertUnauthorized();
    }

    public function test_owner_can_create_a_versioned_record_with_optional_quantity(): void
    {
        [$owner, , $season] = $this->ownedSeason();

        $response = $this->actingAs($owner)
            ->postJson("/api/v1/seasons/{$season->id}/records", [
                'type' => 'harvest',
                'occurredAt' => '2026-05-01T09:30:00+09:00',
                'notes' => '  첫 수확  ',
                'quantity' => 1.25,
                'unit' => '  kg  ',
            ])
            ->assertCreated()
            ->assertHeader('ETag', '"1"')
            ->assertJsonPath('data.seasonId', $season->id)
            ->assertJsonPath('data.type', 'harvest')
            ->assertJsonPath('data.occurredAt', '2026-05-01T00:30:00.000000Z')
            ->assertJsonPath('data.notes', '첫 수확')
            ->assertJsonPath('data.quantity', 1.25)
            ->assertJsonPath('data.unit', 'kg')
            ->assertJsonPath('data.version', 1);

        $recordId = $response->json('data.id');
        $this->assertIsString($recordId);
        $this->assertTrue(Str::isUuid($recordId, version: 7));
        $this->assertDatabaseHas('cultivation_records', [
            'id' => $recordId,
            'growing_season_id' => $season->id,
            'type' => 'harvest',
            'notes' => '첫 수확',
            'unit' => 'kg',
            'version' => 1,
        ]);
    }

    public function test_create_allows_empty_notes_and_rejects_invalid_fields_without_side_effects(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $url = "/api/v1/seasons/{$season->id}/records";

        $this->actingAs($owner)
            ->postJson($url, [
                'type' => 'watering',
                'occurredAt' => '2026-05-01T09:30:00+09:00',
                'notes' => '',
            ])
            ->assertCreated()
            ->assertJsonPath('data.notes', '');

        $this->actingAs($owner)
            ->postJson($url, [
                'type' => 'unknown',
                'occurredAt' => '2026-05-01 09:30:00',
                'notes' => str_repeat('a', 2001),
                'quantity' => 0,
                'unexpected' => true,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'type',
                'occurredAt',
                'notes',
                'quantity',
                'unexpected',
            ], 'error.fields');

        $this->assertDatabaseCount('cultivation_records', 1);
    }

    public function test_create_requires_quantity_and_unit_together_and_date_inside_season(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $url = "/api/v1/seasons/{$season->id}/records";

        $this->actingAs($owner)
            ->postJson($url, [
                'type' => 'growth',
                'occurredAt' => '2027-01-01T00:00:00Z',
                'notes' => '',
                'quantity' => 10,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['occurredAt', 'unit'], 'error.fields');

        $this->actingAs($owner)
            ->postJson($url, [
                'type' => 'growth',
                'occurredAt' => '2026-05-01T00:00:00Z',
                'notes' => '',
                'unit' => 'cm',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity'], 'error.fields');

        $this->assertDatabaseCount('cultivation_records', 0);
    }

    public function test_owner_can_list_records_in_latest_order_and_filter_type(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $older = CultivationRecord::factory()->for($season, 'growingSeason')->create([
            'type' => 'watering',
            'occurred_at' => '2026-04-01T00:00:00Z',
        ]);
        $newer = CultivationRecord::factory()->for($season, 'growingSeason')->create([
            'type' => 'growth',
            'occurred_at' => '2026-05-01T00:00:00Z',
        ]);
        [, , $otherSeason] = $this->ownedSeason();
        CultivationRecord::factory()->for($otherSeason, 'growingSeason')->create();

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}/records?perPage=100")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.1.id', $older->id)
            ->assertJsonPath('meta.total', 2);

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}/records?type=watering")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $older->id);
    }

    public function test_owner_can_list_all_own_records_across_seasons_in_latest_order(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $secondSeason = GrowingSeason::factory()
            ->for(GrowingSpace::factory()->for($owner, 'owner'), 'growingSpace')
            ->create();
        $older = CultivationRecord::factory()->for($season, 'growingSeason')->create([
            'occurred_at' => '2026-04-01T00:00:00Z',
        ]);
        $newer = CultivationRecord::factory()->for($secondSeason, 'growingSeason')->create([
            'occurred_at' => '2026-05-01T00:00:00Z',
        ]);
        [, , $otherSeason] = $this->ownedSeason();
        CultivationRecord::factory()->for($otherSeason, 'growingSeason')->create();

        $this->actingAs($owner)
            ->getJson('/api/v1/records?perPage=100')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.1.id', $older->id)
            ->assertJsonPath('meta.total', 2);
    }

    public function test_guest_cannot_list_all_records(): void
    {
        $this->getJson('/api/v1/records')->assertUnauthorized();
    }

    public function test_other_user_cannot_read_create_update_or_delete_records(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $other = User::factory()->create();
        $record = CultivationRecord::factory()->for($season, 'growingSeason')->create();

        $this->actingAs($other)
            ->getJson("/api/v1/seasons/{$season->id}/records")
            ->assertForbidden();
        $this->actingAs($other)
            ->postJson("/api/v1/seasons/{$season->id}/records", $this->validPayload())
            ->assertForbidden();
        $this->actingAs($other)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/records/{$record->id}", ['notes' => '침범'])
            ->assertForbidden();
        $this->actingAs($other)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/records/{$record->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('cultivation_records', ['id' => $record->id]);
        $this->assertDatabaseCount('cultivation_records', 1);
    }

    public function test_owner_can_update_and_clear_quantity_with_current_version(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $record = CultivationRecord::factory()->for($season, 'growingSeason')->create([
            'quantity' => 2.5,
            'unit' => 'kg',
        ]);
        $url = "/api/v1/records/{$record->id}";

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson($url, [
                'type' => 'growth',
                'occurredAt' => '2026-06-01T10:00:00+09:00',
                'notes' => '  키 측정  ',
                'quantity' => null,
                'unit' => null,
            ])
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.type', 'growth')
            ->assertJsonPath('data.notes', '키 측정')
            ->assertJsonPath('data.quantity', null)
            ->assertJsonPath('data.unit', null)
            ->assertJsonPath('data.version', 2);
    }

    public function test_update_rejects_empty_invalid_and_stale_requests_without_side_effects(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $record = CultivationRecord::factory()->for($season, 'growingSeason')->create(['notes' => '원본']);
        $url = "/api/v1/records/{$record->id}";

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson($url, [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['record'], 'error.fields');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson($url, ['occurredAt' => '2027-01-01T00:00:00Z'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['occurredAt'], 'error.fields');
        $this->actingAs($owner)
            ->withHeader('If-Match', '"9"')
            ->patchJson($url, ['notes' => '변경'])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');

        $this->assertDatabaseHas('cultivation_records', [
            'id' => $record->id,
            'notes' => '원본',
            'version' => 1,
        ]);
    }

    public function test_delete_requires_current_version(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $record = CultivationRecord::factory()->for($season, 'growingSeason')->create(['version' => 2]);
        $url = "/api/v1/records/{$record->id}";

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson($url)
            ->assertStatus(412);
        $this->assertDatabaseHas('cultivation_records', ['id' => $record->id]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->deleteJson($url)
            ->assertNoContent();
        $this->assertDatabaseMissing('cultivation_records', ['id' => $record->id]);
    }

    public function test_season_with_records_cannot_be_deleted(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        CultivationRecord::factory()->for($season, 'growingSeason')->create();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/seasons/{$season->id}")
            ->assertConflict()
            ->assertJsonPath('error.code', 'SEASON_HAS_RECORDS');

        $this->assertDatabaseHas('growing_seasons', ['id' => $season->id]);
    }

    /** @return array{User, GrowingSpace, GrowingSeason} */
    private function ownedSeason(): array
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();

        return [$owner, $space, $season];
    }

    /** @return array<string, mixed> */
    private function validPayload(): array
    {
        return [
            'type' => 'work',
            'occurredAt' => '2026-05-01T09:00:00+09:00',
            'notes' => '',
        ];
    }
}
