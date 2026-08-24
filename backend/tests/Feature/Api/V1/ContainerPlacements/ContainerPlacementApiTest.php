<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\ContainerPlacements;

use App\Enums\GrowingSpaceType;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use App\Models\WateringSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContainerPlacementApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_container_placement_endpoints(): void
    {
        $season = GrowingSeason::factory()->create();

        $this->getJson("/api/v1/seasons/{$season->id}/container-placements")->assertUnauthorized();
        $this->putJson("/api/v1/seasons/{$season->id}/container-placements", ['placements' => []])
            ->assertUnauthorized();
    }

    public function test_owner_can_place_several_crops_in_one_pot_and_span_several_pots(): void
    {
        [$owner, $pot, $season] = $this->ownedSeason(type: GrowingSpaceType::Balcony);
        $secondPot = GrowingSpace::factory()->for($owner, 'owner')->create(['type' => GrowingSpaceType::Balcony]);

        $response = $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson("/api/v1/seasons/{$season->id}/container-placements", [
                'placements' => [
                    ['spaceId' => $pot->id, 'cropId' => 'lettuce', 'quantity' => 3, 'position' => ['x' => 1, 'y' => 1]],
                    ['spaceId' => $pot->id, 'cropId' => 'carrot', 'quantity' => 5, 'position' => null],
                    ['spaceId' => $secondPot->id, 'cropId' => 'tomato', 'quantity' => 1],
                ],
            ]);

        $response
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.seasonId', $season->id)
            ->assertJsonPath('data.version', 2)
            ->assertJsonCount(3, 'data.placements')
            ->assertJsonPath('data.placements.0.position.x', 1);

        $this->assertDatabaseCount('container_placements', 3);
        $this->assertDatabaseHas('container_placements', [
            'growing_season_id' => $season->id,
            'growing_space_id' => $pot->id,
            'crop_id' => 'lettuce',
            'quantity' => 3,
        ]);
        $this->assertDatabaseHas('container_placements', [
            'growing_season_id' => $season->id,
            'growing_space_id' => $secondPot->id,
            'crop_id' => 'tomato',
            'quantity' => 1,
        ]);

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}/container-placements")
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonCount(3, 'data.placements');
    }

    public function test_empty_placements_list_is_allowed_and_readable_before_any_put(): void
    {
        [$owner, , $season] = $this->ownedSeason(type: GrowingSpaceType::Indoor);

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$season->id}/container-placements")
            ->assertOk()
            ->assertHeader('ETag', '"1"')
            ->assertJsonCount(0, 'data.placements');
    }

    public function test_garden_type_season_is_rejected(): void
    {
        [$owner, , $season] = $this->ownedSeason(type: GrowingSpaceType::Garden);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson("/api/v1/seasons/{$season->id}/container-placements", ['placements' => []])
            ->assertConflict()
            ->assertJsonPath('error.code', 'CONTAINER_PLACEMENT_REQUIRES_CONTAINER_SEASON');

        $this->assertDatabaseCount('container_placements', 0);
    }

    public function test_rejects_other_owners_pot_and_unsupported_crop_without_side_effects(): void
    {
        [$owner, $pot, $season] = $this->ownedSeason(type: GrowingSpaceType::Balcony);
        $strangersPot = GrowingSpace::factory()->create(['type' => GrowingSpaceType::Balcony]);

        $response = $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson("/api/v1/seasons/{$season->id}/container-placements", [
                'placements' => [
                    ['spaceId' => $strangersPot->id, 'cropId' => 'lettuce', 'quantity' => 1],
                    ['spaceId' => $pot->id, 'cropId' => 'potato', 'quantity' => 1],
                ],
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'placements.0.spaceId',
                'placements.1.cropId',
            ], 'error.fields');

        $this->assertDatabaseCount('container_placements', 0);
    }

    public function test_replace_requires_current_version_and_is_atomic(): void
    {
        [$owner, $pot, $season] = $this->ownedSeason(type: GrowingSpaceType::Balcony);
        $url = "/api/v1/seasons/{$season->id}/container-placements";

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson($url, [
                'placements' => [['spaceId' => $pot->id, 'cropId' => 'lettuce', 'quantity' => 2]],
            ])
            ->assertOk()
            ->assertHeader('ETag', '"2"');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson($url, [
                'placements' => [['spaceId' => $pot->id, 'cropId' => 'carrot', 'quantity' => 4]],
            ])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');

        $this->assertDatabaseHas('container_placements', ['growing_season_id' => $season->id, 'crop_id' => 'lettuce']);
        $this->assertDatabaseMissing('container_placements', ['growing_season_id' => $season->id, 'crop_id' => 'carrot']);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->putJson($url, [
                'placements' => [['spaceId' => $pot->id, 'cropId' => 'carrot', 'quantity' => 4]],
            ])
            ->assertOk()
            ->assertHeader('ETag', '"3"')
            ->assertJsonCount(1, 'data.placements')
            ->assertJsonPath('data.placements.0.cropId', 'carrot');

        $this->assertDatabaseMissing('container_placements', ['growing_season_id' => $season->id, 'crop_id' => 'lettuce']);
    }

    public function test_crop_with_watering_schedule_cannot_be_removed_from_placements(): void
    {
        [$owner, $pot, $season] = $this->ownedSeason(type: GrowingSpaceType::Balcony);
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson("/api/v1/seasons/{$season->id}/container-placements", [
                'placements' => [['spaceId' => $pot->id, 'cropId' => 'lettuce', 'quantity' => 2]],
            ])
            ->assertOk();

        WateringSchedule::factory()->for($season, 'growingSeason')->create(['crop_id' => 'lettuce']);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->putJson("/api/v1/seasons/{$season->id}/container-placements", [
                'placements' => [['spaceId' => $pot->id, 'cropId' => 'carrot', 'quantity' => 1]],
            ])
            ->assertConflict()
            ->assertJsonPath('error.code', 'CONTAINER_PLACEMENT_CROP_HAS_WATERING_SCHEDULE');
    }

    public function test_other_user_cannot_view_or_replace_placements(): void
    {
        [$owner, $pot, $season] = $this->ownedSeason(type: GrowingSpaceType::Balcony);
        $other = User::factory()->create();

        $this->actingAs($other)
            ->getJson("/api/v1/seasons/{$season->id}/container-placements")
            ->assertForbidden();

        $this->actingAs($other)
            ->withHeader('If-Match', '"1"')
            ->putJson("/api/v1/seasons/{$season->id}/container-placements", [
                'placements' => [['spaceId' => $pot->id, 'cropId' => 'lettuce', 'quantity' => 1]],
            ])
            ->assertForbidden();
    }

    public function test_season_with_placements_cannot_be_deleted_until_cleared(): void
    {
        [$owner, $pot, $season] = $this->ownedSeason(type: GrowingSpaceType::Balcony);
        $url = "/api/v1/seasons/{$season->id}/container-placements";
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->putJson($url, ['placements' => [['spaceId' => $pot->id, 'cropId' => 'lettuce', 'quantity' => 1]]])
            ->assertOk();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->deleteJson("/api/v1/seasons/{$season->id}")
            ->assertConflict()
            ->assertJsonPath('error.code', 'SEASON_HAS_CONTAINER_PLACEMENTS');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->putJson($url, ['placements' => []])
            ->assertOk()
            ->assertJsonCount(0, 'data.placements');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"3"')
            ->deleteJson("/api/v1/seasons/{$season->id}")
            ->assertNoContent();
    }

    /** @return array{User, GrowingSpace, GrowingSeason} */
    private function ownedSeason(GrowingSpaceType $type): array
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create(['type' => $type]);
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();

        return [$owner, $space, $season];
    }
}
