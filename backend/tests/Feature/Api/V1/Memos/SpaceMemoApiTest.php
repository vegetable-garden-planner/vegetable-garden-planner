<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Memos;

use App\Models\GrowingSpace;
use App\Models\SpaceMemo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpaceMemoApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_memo_endpoints(): void
    {
        $space = GrowingSpace::factory()->create();
        $memo = SpaceMemo::factory()->for($space, 'growingSpace')->create();

        $this->getJson("/api/v1/spaces/{$space->id}/memos")->assertUnauthorized();
        $this->postJson("/api/v1/spaces/{$space->id}/memos", ['body' => '메모'])->assertUnauthorized();
        $this->patchJson("/api/v1/memos/{$memo->id}", ['body' => '수정'])->assertUnauthorized();
        $this->deleteJson("/api/v1/memos/{$memo->id}")->assertUnauthorized();
    }

    public function test_owner_can_create_list_and_read_memos_for_a_pot_or_a_crop_in_it(): void
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();

        $response = $this->actingAs($owner)->postJson("/api/v1/spaces/{$space->id}/memos", [
            'body' => '  오늘 새 잎 확인  ',
        ]);
        $response
            ->assertCreated()
            ->assertHeader('ETag', '"1"')
            ->assertJsonPath('data.spaceId', $space->id)
            ->assertJsonPath('data.cropId', null)
            ->assertJsonPath('data.body', '오늘 새 잎 확인')
            ->assertJsonPath('data.version', 1);

        $this->actingAs($owner)->postJson("/api/v1/spaces/{$space->id}/memos", [
            'body' => '흙이 빨리 마르는 것 같음',
            'cropId' => 'lettuce',
        ])
            ->assertCreated()
            ->assertJsonPath('data.cropId', 'lettuce');

        $this->actingAs($owner)
            ->getJson("/api/v1/spaces/{$space->id}/memos")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.body', '흙이 빨리 마르는 것 같음');

        $this->assertDatabaseCount('space_memos', 2);
    }

    public function test_create_rejects_blank_body_and_unknown_crop(): void
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();

        $this->actingAs($owner)
            ->postJson("/api/v1/spaces/{$space->id}/memos", ['body' => '  ', 'cropId' => 'not-a-crop'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['body', 'cropId'], 'error.fields');

        $this->assertDatabaseCount('space_memos', 0);
    }

    public function test_other_user_cannot_read_or_write_memos_for_someone_elses_pot(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();

        $this->actingAs($other)
            ->getJson("/api/v1/spaces/{$space->id}/memos")
            ->assertForbidden();

        $this->actingAs($other)
            ->postJson("/api/v1/spaces/{$space->id}/memos", ['body' => '몰래 메모'])
            ->assertForbidden();

        $this->assertDatabaseCount('space_memos', 0);
    }

    public function test_owner_can_update_memo_with_matching_version(): void
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $memo = SpaceMemo::factory()->for($space, 'growingSpace')->create(['body' => '원래 메모']);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/memos/{$memo->id}", ['body' => '  수정한 메모  '])
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.body', '수정한 메모')
            ->assertJsonPath('data.version', 2);

        $this->assertDatabaseHas('space_memos', ['id' => $memo->id, 'body' => '수정한 메모', 'version' => 2]);
    }

    public function test_stale_version_and_empty_patch_are_rejected(): void
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $memo = SpaceMemo::factory()->for($space, 'growingSpace')->create();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"9"')
            ->patchJson("/api/v1/memos/{$memo->id}", ['body' => '덮어쓴 메모'])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/memos/{$memo->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['memo'], 'error.fields');

        $this->assertSame($memo->body, $memo->fresh()->body);
    }

    public function test_owner_can_delete_memo_with_current_version(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create(['version' => 1]);
        $memo = SpaceMemo::factory()->for($space, 'growingSpace')->create(['version' => 2]);

        $this->actingAs($other)
            ->withHeader('If-Match', '"2"')
            ->deleteJson("/api/v1/memos/{$memo->id}")
            ->assertForbidden();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/memos/{$memo->id}")
            ->assertStatus(412);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->deleteJson("/api/v1/memos/{$memo->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('space_memos', ['id' => $memo->id]);
    }

    public function test_space_with_memos_cannot_be_deleted_until_memos_are_removed(): void
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $memo = SpaceMemo::factory()->for($space, 'growingSpace')->create();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/spaces/{$space->id}")
            ->assertConflict()
            ->assertJsonPath('error.code', 'SPACE_HAS_MEMOS');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/memos/{$memo->id}")
            ->assertNoContent();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->deleteJson("/api/v1/spaces/{$space->id}")
            ->assertNoContent();
    }
}
