<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Spaces;

use App\Enums\GrowingSpaceType;
use App\Enums\SpaceOrientation;
use App\Enums\SunlightExposure;
use App\Models\GrowingSpace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class GrowingSpaceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_space_endpoints(): void
    {
        $this->getJson('/api/v1/spaces')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');

        $this->postJson('/api/v1/spaces', $this->validPayload())
            ->assertUnauthorized();
    }

    public function test_user_can_create_a_space_owned_by_the_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/spaces', [
            ...$this->validPayload(),
            'name' => '  주말 텃밭  ',
            'notes' => '  남향 구역  ',
            'address' => '  서울특별시 중구 세종대로 110  ',
            'latitude' => 37.5665,
            'longitude' => 126.978,
            'orientation' => SpaceOrientation::South->value,
            'estimatedSunlightHours' => 6.5,
            'depthCm' => 25,
        ]);

        $response
            ->assertCreated()
            ->assertHeader('ETag', '"1"')
            ->assertJsonPath('data.name', '주말 텃밭')
            ->assertJsonPath('data.widthCm', 200)
            ->assertJsonPath('data.depthCm', 25)
            ->assertJsonPath('data.notes', '남향 구역')
            ->assertJsonPath('data.address', '서울특별시 중구 세종대로 110')
            ->assertJsonPath('data.orientation', 'south')
            ->assertJsonPath('data.estimatedSunlightHours', 6.5)
            ->assertJsonPath('data.version', 1);

        $space = GrowingSpace::query()->sole();

        $this->assertSame($user->id, $space->owner_id);
        $this->assertTrue(Str::isUuid($space->id, version: 7));
    }

    public function test_create_rejects_boundaries_invalid_enums_and_owner_injection(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/spaces', [
            'name' => ' ',
            'type' => 'rooftop',
            'sunlight' => 'unknown',
            'widthCm' => 9,
            'lengthCm' => 100001,
            'depthCm' => 0,
            'notes' => '',
            'ownerId' => User::factory()->create()->id,
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonValidationErrors([
                'name',
                'type',
                'sunlight',
                'widthCm',
                'lengthCm',
                'depthCm',
                'ownerId',
            ], 'error.fields');

        $this->assertDatabaseCount('growing_spaces', 0);
    }

    public function test_list_is_paginated_and_contains_only_the_users_spaces(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        GrowingSpace::factory()->count(3)->for($user, 'owner')->create();
        GrowingSpace::factory()->for($other, 'owner')->create();

        $response = $this->actingAs($user)->getJson('/api/v1/spaces?perPage=2&page=2');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.currentPage', 2)
            ->assertJsonPath('meta.perPage', 2)
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.lastPage', 2);
    }

    public function test_list_rejects_unknown_query_parameters(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/spaces?perPage=101&ownerId=someone')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['perPage', 'ownerId'], 'error.fields');
    }

    public function test_owner_can_read_space_with_version_etag(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create(['version' => 3]);

        $this->actingAs($user)
            ->getJson("/api/v1/spaces/{$space->id}")
            ->assertOk()
            ->assertHeader('ETag', '"3"')
            ->assertJsonPath('data.id', $space->id);
    }

    public function test_other_users_space_is_forbidden_and_missing_space_is_not_found(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();

        $this->actingAs($other)
            ->getJson("/api/v1/spaces/{$space->id}")
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');

        $this->actingAs($other)
            ->getJson('/api/v1/spaces/'.Str::uuid()->toString())
            ->assertNotFound()
            ->assertJsonPath('error.code', 'RESOURCE_NOT_FOUND');
    }

    public function test_owner_can_update_space_with_matching_version(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();

        $response = $this->actingAs($user)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/spaces/{$space->id}", [
                'name' => '  수정한 텃밭  ',
                'widthCm' => 450,
                'depthCm' => 30,
            ]);

        $response
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.name', '수정한 텃밭')
            ->assertJsonPath('data.widthCm', 450)
            ->assertJsonPath('data.depthCm', 30)
            ->assertJsonPath('data.version', 2);

        $this->assertDatabaseHas('growing_spaces', [
            'id' => $space->id,
            'name' => '수정한 텃밭',
            'version' => 2,
        ]);
    }

    public function test_stale_or_missing_version_cannot_update_space(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create(['version' => 2]);

        $this->actingAs($user)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/spaces/{$space->id}", ['name' => '덮어쓴 이름'])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');

        $this->actingAs($user)
            ->withoutHeader('If-Match')
            ->patchJson("/api/v1/spaces/{$space->id}", ['name' => '헤더 없는 이름'])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'PRECONDITION_REQUIRED');

        $this->assertSame($space->name, $space->fresh()->name);
        $this->assertSame(2, $space->fresh()->version);
    }

    public function test_empty_patch_is_rejected_without_incrementing_version(): void
    {
        $user = User::factory()->create();
        $space = GrowingSpace::factory()->for($user, 'owner')->create();

        $this->actingAs($user)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/spaces/{$space->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['_request'], 'error.fields');

        $this->assertSame(1, $space->fresh()->version);
    }

    public function test_delete_requires_ownership_and_current_version(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create(['version' => 2]);

        $this->actingAs($other)
            ->withHeader('If-Match', '"2"')
            ->deleteJson("/api/v1/spaces/{$space->id}")
            ->assertForbidden();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/spaces/{$space->id}")
            ->assertStatus(412);

        $this->assertDatabaseHas('growing_spaces', ['id' => $space->id]);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->deleteJson("/api/v1/spaces/{$space->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('growing_spaces', ['id' => $space->id]);
    }

    /**
     * @return array<string, int|string>
     */
    private function validPayload(): array
    {
        return [
            'name' => '주말 텃밭',
            'type' => GrowingSpaceType::Garden->value,
            'sunlight' => SunlightExposure::Full->value,
            'widthCm' => 200,
            'lengthCm' => 300,
            'notes' => '',
        ];
    }
}
