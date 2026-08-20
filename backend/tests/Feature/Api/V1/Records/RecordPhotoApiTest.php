<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Records;

use App\Models\CultivationRecord;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RecordPhotoApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('uploads');
    }

    public function test_guest_cannot_change_record_photo(): void
    {
        $record = CultivationRecord::factory()->create();

        $this->postJson("/api/v1/records/{$record->id}/photo")->assertUnauthorized();
        $this->deleteJson("/api/v1/records/{$record->id}/photo")->assertUnauthorized();
    }

    public function test_other_member_cannot_change_record_photo(): void
    {
        [, $record] = $this->ownedRecord();

        $this->actingAs(User::factory()->create())
            ->withHeader('If-Match', '"1"')
            ->post("/api/v1/records/{$record->id}/photo", ['photo' => $this->image()])
            ->assertForbidden();

        $this->assertDatabaseHas('cultivation_records', [
            'id' => $record->id,
            'photo_path' => null,
        ]);
    }

    public function test_owner_uploads_photo_and_record_version_increases(): void
    {
        [$owner, $record] = $this->ownedRecord();

        $response = $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->post("/api/v1/records/{$record->id}/photo", ['photo' => $this->image()])
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.version', 2);

        $storedPath = $record->fresh()?->photo_path;
        $this->assertIsString($storedPath);
        $this->assertStringStartsWith('records/', $storedPath);
        Storage::disk('uploads')->assertExists($storedPath);
        $this->assertSame(
            Storage::disk('uploads')->url($storedPath),
            $response->json('data.photoUrl'),
        );
    }

    public function test_uploading_again_replaces_the_previous_file(): void
    {
        [$owner, $record] = $this->ownedRecord();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->post("/api/v1/records/{$record->id}/photo", ['photo' => $this->image()])
            ->assertOk();
        $firstPath = $record->fresh()?->photo_path;

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->post("/api/v1/records/{$record->id}/photo", ['photo' => $this->image('second.png')])
            ->assertOk()
            ->assertHeader('ETag', '"3"');
        $secondPath = $record->fresh()?->photo_path;

        $this->assertIsString($firstPath);
        $this->assertIsString($secondPath);
        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('uploads')->assertMissing($firstPath);
        Storage::disk('uploads')->assertExists($secondPath);
    }

    public function test_owner_can_remove_the_photo(): void
    {
        [$owner, $record] = $this->ownedRecord();
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->post("/api/v1/records/{$record->id}/photo", ['photo' => $this->image()])
            ->assertOk();
        $storedPath = $record->fresh()?->photo_path;
        $this->assertIsString($storedPath);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->deleteJson("/api/v1/records/{$record->id}/photo")
            ->assertOk()
            ->assertHeader('ETag', '"3"')
            ->assertJsonPath('data.photoUrl', null);

        Storage::disk('uploads')->assertMissing($storedPath);
        $this->assertDatabaseHas('cultivation_records', [
            'id' => $record->id,
            'photo_path' => null,
        ]);
    }

    public function test_only_image_files_within_the_size_limit_are_accepted(): void
    {
        [$owner, $record] = $this->ownedRecord();

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->post("/api/v1/records/{$record->id}/photo", [
                'photo' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
            ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->post("/api/v1/records/{$record->id}/photo", [
                'photo' => UploadedFile::fake()->image('huge.jpg')->size(5121),
            ])
            ->assertStatus(422);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->post("/api/v1/records/{$record->id}/photo", [])
            ->assertStatus(422);

        $this->assertDatabaseHas('cultivation_records', [
            'id' => $record->id,
            'photo_path' => null,
            'version' => 1,
        ]);
        $this->assertSame([], Storage::disk('uploads')->allFiles());
    }

    public function test_stale_if_match_is_rejected_and_leaves_no_orphan_file(): void
    {
        [$owner, $record] = $this->ownedRecord();

        $this->actingAs($owner)
            ->post("/api/v1/records/{$record->id}/photo", ['photo' => $this->image()])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'PRECONDITION_REQUIRED');

        $this->actingAs($owner)
            ->withHeader('If-Match', '"7"')
            ->post("/api/v1/records/{$record->id}/photo", ['photo' => $this->image()])
            ->assertStatus(412)
            ->assertJsonPath('error.code', 'VERSION_CONFLICT');

        $this->assertSame([], Storage::disk('uploads')->allFiles());
        $this->assertDatabaseHas('cultivation_records', [
            'id' => $record->id,
            'photo_path' => null,
            'version' => 1,
        ]);
    }

    public function test_deleting_a_record_also_deletes_its_photo(): void
    {
        [$owner, $record] = $this->ownedRecord();
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->post("/api/v1/records/{$record->id}/photo", ['photo' => $this->image()])
            ->assertOk();
        $storedPath = $record->fresh()?->photo_path;
        $this->assertIsString($storedPath);

        $this->actingAs($owner)
            ->withHeader('If-Match', '"2"')
            ->deleteJson("/api/v1/records/{$record->id}")
            ->assertNoContent();

        Storage::disk('uploads')->assertMissing($storedPath);
    }

    public function test_record_list_exposes_the_photo_url(): void
    {
        [$owner, $record] = $this->ownedRecord();
        $this->actingAs($owner)
            ->withHeader('If-Match', '"1"')
            ->post("/api/v1/records/{$record->id}/photo", ['photo' => $this->image()])
            ->assertOk();

        $this->actingAs($owner)
            ->getJson("/api/v1/seasons/{$record->growing_season_id}/records")
            ->assertOk()
            ->assertJsonPath(
                'data.0.photoUrl',
                Storage::disk('uploads')->url((string) $record->fresh()?->photo_path),
            );
    }

    private function image(string $name = 'garden.jpg'): UploadedFile
    {
        return UploadedFile::fake()->image($name, 800, 600);
    }

    /** @return array{User, CultivationRecord} */
    private function ownedRecord(): array
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();

        return [$owner, CultivationRecord::factory()->for($season, 'growingSeason')->create()];
    }
}
