<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class CoreUserJourneyTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_complete_the_core_gardening_journey_through_the_api(): void
    {
        $this->withHeader('Origin', 'http://localhost:3000');

        $userId = $this->registerMember();
        $spaceId = $this->createGarden();
        $seasonId = $this->createSeason($spaceId);
        $this->placeCrop($seasonId);
        $taskId = $this->generateAndCompleteTask($seasonId);
        $wateringScheduleId = $this->createAndCompleteWatering($seasonId);
        $recordId = $this->createSeasonRecord($seasonId);

        $this->assertJourneyIsVisible(
            $userId,
            $spaceId,
            $seasonId,
            $taskId,
            $wateringScheduleId,
            $recordId,
        );
    }

    private function registerMember(): string
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'journey@example.com',
            'nickname' => '통합테스트농부',
            'password' => 'garden123',
            'passwordConfirmation' => 'garden123',
        ])->assertCreated();

        $userId = $this->uuidFrom($response, 'data.user.id');

        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $userId);

        return $userId;
    }

    private function createGarden(): string
    {
        $response = $this->postJson('/api/v1/spaces', [
            'name' => '통합 테스트 텃밭',
            'type' => 'garden',
            'sunlight' => 'full',
            'widthCm' => 200,
            'lengthCm' => 300,
            'notes' => '회원가입부터 만든 공간',
        ])
            ->assertCreated()
            ->assertHeader('ETag', '"1"');

        return $this->uuidFrom($response);
    }

    private function createSeason(string $spaceId): string
    {
        $response = $this->postJson('/api/v1/seasons', [
            'spaceId' => $spaceId,
            'name' => '2026년 핵심 여정',
            'startDate' => '2026-03-01',
            'endDate' => '2026-09-30',
            'notes' => '통합 테스트 시즌',
            'featuredCropId' => 'lettuce',
        ])
            ->assertCreated()
            ->assertJsonPath('data.featuredCropId', 'lettuce');

        return $this->uuidFrom($response);
    }

    private function placeCrop(string $seasonId): void
    {
        $this->putJson("/api/v1/seasons/{$seasonId}/layout", [
            'spaceWidthCm' => 200,
            'spaceLengthCm' => 300,
            'cellSizeCm' => 25,
            'placements' => [
                ['cellIndex' => 0, 'cropId' => 'lettuce'],
                ['cellIndex' => 1, 'cropId' => 'lettuce'],
            ],
        ])
            ->assertCreated()
            ->assertHeader('ETag', '"1"')
            ->assertJsonCount(2, 'data.placements');
    }

    private function generateAndCompleteTask(string $seasonId): string
    {
        $response = $this->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/seasons/{$seasonId}/tasks/generate")
            ->assertCreated()
            ->assertJsonCount(2, 'data');
        $taskId = $this->uuidFrom($response, 'data.0.id');

        $this->withHeader('If-Match', '"1"')
            ->patchJson("/api/v1/tasks/{$taskId}", ['status' => 'completed'])
            ->assertOk()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.status', 'completed');

        return $taskId;
    }

    private function createAndCompleteWatering(string $seasonId): string
    {
        $response = $this->withoutHeader('If-Match')
            ->postJson("/api/v1/seasons/{$seasonId}/watering-schedules", [
                'cropId' => 'lettuce',
                'intervalDays' => 3,
                'nextWateringAt' => '2026-05-01T09:00:00+09:00',
                'enabled' => true,
            ])
            ->assertCreated();
        $scheduleId = $this->uuidFrom($response);

        $this->withHeader('If-Match', '"1"')
            ->postJson("/api/v1/watering-schedules/{$scheduleId}/complete", [
                'wateredAt' => '2026-05-02T09:30:00+09:00',
                'amountMl' => 750,
                'memo' => '첫 물주기 완료',
            ])
            ->assertCreated()
            ->assertHeader('ETag', '"2"')
            ->assertJsonPath('data.schedule.version', 2);

        return $scheduleId;
    }

    private function createSeasonRecord(string $seasonId): string
    {
        $response = $this->withoutHeader('If-Match')
            ->postJson("/api/v1/seasons/{$seasonId}/records", [
                'type' => 'growth',
                'occurredAt' => '2026-05-03T10:00:00+09:00',
                'notes' => '상추 새잎을 확인함',
                'quantity' => 8.5,
                'unit' => 'cm',
            ])
            ->assertCreated()
            ->assertHeader('ETag', '"1"');

        return $this->uuidFrom($response);
    }

    private function assertJourneyIsVisible(
        string $userId,
        string $spaceId,
        string $seasonId,
        string $taskId,
        string $wateringScheduleId,
        string $recordId,
    ): void {
        $this->getJson('/api/v1/spaces?perPage=100')
            ->assertOk()
            ->assertJsonPath('data.0.id', $spaceId);
        $this->getJson('/api/v1/seasons?perPage=100')
            ->assertOk()
            ->assertJsonPath('data.0.id', $seasonId);
        $this->getJson('/api/v1/layouts?perPage=100')
            ->assertOk()
            ->assertJsonPath('data.0.seasonId', $seasonId);
        $this->getJson('/api/v1/tasks?perPage=100')
            ->assertOk()
            ->assertJsonFragment(['id' => $taskId, 'status' => 'completed']);
        $this->getJson('/api/v1/watering-schedules?perPage=100')
            ->assertOk()
            ->assertJsonFragment(['id' => $wateringScheduleId, 'version' => 2]);
        $this->getJson("/api/v1/seasons/{$seasonId}/records?perPage=100")
            ->assertOk()
            ->assertJsonFragment(['id' => $recordId, 'type' => 'growth']);

        $this->assertDatabaseHas('growing_spaces', ['id' => $spaceId, 'owner_id' => $userId]);
        $this->assertDatabaseHas('growing_seasons', ['id' => $seasonId, 'growing_space_id' => $spaceId]);
        $this->assertDatabaseHas('cultivation_tasks', ['id' => $taskId, 'status' => 'completed']);
        $this->assertDatabaseHas('watering_logs', ['watering_schedule_id' => $wateringScheduleId]);
        $this->assertDatabaseHas('cultivation_records', ['id' => $recordId, 'growing_season_id' => $seasonId]);
    }

    private function uuidFrom(TestResponse $response, string $path = 'data.id'): string
    {
        $id = $response->json($path);

        $this->assertIsString($id);
        $this->assertTrue(Str::isUuid($id, version: 7));

        return $id;
    }
}
