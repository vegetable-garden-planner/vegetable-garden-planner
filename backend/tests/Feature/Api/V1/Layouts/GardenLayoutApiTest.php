<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Layouts;

use App\Enums\GrowingSpaceType;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GardenLayoutApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_layout_endpoints(): void
    {
        $season = GrowingSeason::factory()->create();

        $this->getJson("/api/v1/seasons/{$season->id}/layout")->assertUnauthorized();
        $this->putJson("/api/v1/seasons/{$season->id}/layout", [])->assertUnauthorized();
        $this->deleteJson("/api/v1/seasons/{$season->id}/layout")->assertUnauthorized();
    }

    public function test_owner_can_create_and_read_layout_with_server_calculated_grid(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();

        $this->actingAs($owner)
            ->putJson("/api/v1/seasons/{$season->id}/layout", $this->validPayload($space))
            ->assertCreated()
            ->assertHeader('ETag', '"1"')
            ->assertJsonPath('data.seasonId', $season->id)
            ->assertJsonPath('data.spaceId', $space->id)
            ->assertJsonPath('data.columns', 8)
            ->assertJsonPath('data.rows', 12)
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.placements.0.cellIndex', 0)
            ->assertJsonPath('data.placements.1.cellIndex', 3);

        $this->assertDatabaseHas('garden_layouts', [
            'growing_season_id' => $season->id,
            'columns' => 8,
            'rows' => 12,
            'version' => 1,
        ]);
        $this->assertDatabaseCount('garden_layout_placements', 2);

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}/layout")
            ->assertOk()
            ->assertHeader('ETag', '"1"')
            ->assertJsonCount(2, 'data.placements');
    }

    public function test_owner_can_create_an_empty_grid_before_placing_crops(): void
    {
        [$owner, $space, $season] = $this->ownedSeason([
            'width_cm' => 50,
            'length_cm' => 100,
        ]);

        $this->actingAs($owner)
            ->putJson("/api/v1/seasons/{$season->id}/layout", [
                'spaceWidthCm' => 50,
                'spaceLengthCm' => 100,
                'cellSizeCm' => 50,
                'placements' => [],
            ])
            ->assertCreated()
            ->assertJsonPath('data.columns', 1)
            ->assertJsonPath('data.rows', 2)
            ->assertJsonCount(0, 'data.placements');

        $this->assertDatabaseHas('garden_layouts', [
            'growing_season_id' => $season->id,
            'columns' => 1,
            'rows' => 2,
        ]);
        $this->assertDatabaseCount('garden_layout_placements', 0);
    }

    public function test_missing_layout_is_not_found_and_other_user_is_forbidden(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();
        $other = User::factory()->create();

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}/layout")
            ->assertNotFound();

        $this->actingAs($other)
            ->putJson("/api/v1/seasons/{$season->id}/layout", $this->validPayload($space))
            ->assertForbidden();

        $this->assertDatabaseCount('garden_layouts', 0);
    }

    public function test_list_contains_only_owned_layouts(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();
        [$other, $otherSpace, $otherSeason] = $this->ownedSeason();

        $this->actingAs($owner)
            ->putJson("/api/v1/seasons/{$season->id}/layout", $this->validPayload($space))
            ->assertCreated();
        $this->actingAs($other)
            ->putJson("/api/v1/seasons/{$otherSeason->id}/layout", $this->validPayload($otherSpace))
            ->assertCreated();

        $this->actingAs($owner)
            ->getJson('/api/v1/layouts?perPage=100')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.seasonId', $season->id)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_create_rejects_unknown_duplicate_out_of_range_and_unsupported_crop_fields(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();
        $payload = $this->validPayload($space);
        $payload['unexpected'] = true;
        $payload['placements'] = [
            ['cellIndex' => 0, 'cropId' => 'lettuce'],
            ['cellIndex' => 0, 'cropId' => 'gift-bouquet', 'note' => 'unknown'],
            ['cellIndex' => 96, 'cropId' => 'lettuce'],
        ];

        $this->actingAs($owner)
            ->putJson("/api/v1/seasons/{$season->id}/layout", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'unexpected',
                'placements.1',
                'placements.1.cellIndex',
                'placements.1.cropId',
                'placements.2.cellIndex',
            ], 'error.fields');

        $this->assertDatabaseCount('garden_layouts', 0);
        $this->assertDatabaseCount('garden_layout_placements', 0);
    }

    public function test_create_rejects_grid_over_400_cells_without_side_effects(): void
    {
        [$owner, $space, $season] = $this->ownedSeason([
            'width_cm' => 1000,
            'length_cm' => 1000,
        ]);

        $this->actingAs($owner)
            ->putJson("/api/v1/seasons/{$season->id}/layout", [
                ...$this->validPayload($space),
                'cellSizeCm' => 10,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cellSizeCm'], 'error.fields');

        $this->assertDatabaseCount('garden_layouts', 0);
    }

    public function test_balcony_space_accepts_only_balcony_compatible_crops(): void
    {
        [$owner, $space, $season] = $this->ownedSeason(['type' => GrowingSpaceType::Balcony]);

        $this->actingAs($owner)
            ->putJson("/api/v1/seasons/{$season->id}/layout", $this->validPayload($space))
            ->assertCreated()
            ->assertJsonPath('data.placements.0.cropId', 'lettuce')
            ->assertJsonPath('data.placements.1.cropId', 'carrot');

        $this->assertDatabaseCount('garden_layouts', 1);
        $this->assertDatabaseCount('garden_layout_placements', 2);
    }

    public function test_indoor_space_rejects_a_crop_that_is_not_indoor_compatible(): void
    {
        [$owner, $space, $season] = $this->ownedSeason(['type' => GrowingSpaceType::Indoor]);

        $this->actingAs($owner)
            ->putJson("/api/v1/seasons/{$season->id}/layout", [
                ...$this->validPayload($space),
                'placements' => [['cellIndex' => 0, 'cropId' => 'lettuce']],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['placements.0.cropId'], 'error.fields');

        $this->assertDatabaseCount('garden_layouts', 0);
        $this->assertDatabaseCount('garden_layout_placements', 0);
    }

    public function test_stale_space_dimensions_are_a_conflict(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();

        $payload = $this->validPayload($space);
        $payload['spaceWidthCm'] = $space->width_cm - 10;

        $this->actingAs($owner)
            ->putJson("/api/v1/seasons/{$season->id}/layout", $payload)
            ->assertConflict()
            ->assertJsonPath('error.code', 'SPACE_DIMENSIONS_CHANGED');

        $this->assertDatabaseCount('garden_layouts', 0);
    }

    public function test_replace_requires_current_version_and_is_atomic(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();
        $url = "/api/v1/seasons/{$season->id}/layout";

        $this->actingAs($owner)->putJson($url, $this->validPayload($space))->assertCreated();

        $replacement = [
            ...$this->validPayload($space),
            'cellSizeCm' => 50,
            'placements' => [['cellIndex' => 1, 'cropId' => 'carrot']],
        ];

        $this->actingAs($owner)
            ->putJson($url, $replacement)
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'PRECONDITION_REQUIRED');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"9"')
            ->putJson($url, $replacement)
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');

        $this->assertDatabaseHas('garden_layouts', ['growing_season_id' => $season->id, 'version' => 1]);
        $this->assertDatabaseHas('garden_layout_placements', ['cell_index' => 0, 'crop_id' => 'lettuce']);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson($url, $replacement)
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.version', 2)
            ->assertJsonCount(1, 'data.placements')
            ->assertJsonPath('data.placements.0.cropId', 'carrot');

        $this->assertDatabaseMissing('garden_layout_placements', ['cell_index' => 0, 'crop_id' => 'lettuce']);
    }

    public function test_delete_requires_current_version_and_removes_placements(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();
        $url = "/api/v1/seasons/{$season->id}/layout";
        $this->actingAs($owner)->putJson($url, $this->validPayload($space))->assertCreated();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->deleteJson($url)
            ->assertStatus(412);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson($url)
            ->assertNoContent();

        $this->assertDatabaseCount('garden_layouts', 0);
        $this->assertDatabaseCount('garden_layout_placements', 0);
    }

    public function test_season_with_layout_cannot_be_deleted(): void
    {
        [$owner, $space, $season] = $this->ownedSeason();
        $this->actingAs($owner)
            ->putJson("/api/v1/seasons/{$season->id}/layout", $this->validPayload($space))
            ->assertCreated();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/seasons/{$season->id}")
            ->assertConflict()
            ->assertJsonPath('error.code', 'SEASON_HAS_LAYOUT');

        $this->assertDatabaseHas('growing_seasons', ['id' => $season->id]);
        $this->assertDatabaseHas('garden_layouts', ['growing_season_id' => $season->id]);
    }

    /** @return array{User, GrowingSpace, GrowingSeason} */
    private function ownedSeason(array $spaceAttributes = []): array
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create($spaceAttributes);
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();

        return [$owner, $space, $season];
    }

    /** @return array<string, mixed> */
    private function validPayload(GrowingSpace $space): array
    {
        return [
            'spaceWidthCm' => $space->width_cm,
            'spaceLengthCm' => $space->length_cm,
            'cellSizeCm' => 25,
            'placements' => [
                ['cellIndex' => 3, 'cropId' => 'carrot'],
                ['cellIndex' => 0, 'cropId' => 'lettuce'],
            ],
        ];
    }
}
