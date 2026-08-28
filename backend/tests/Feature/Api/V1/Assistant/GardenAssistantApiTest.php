<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Assistant;

use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use App\Models\WateringSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GardenAssistantApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_ask_the_assistant(): void
    {
        [, , $season] = $this->ownedSeason();

        $this->postJson("/api/v1/seasons/{$season->id}/assistant/ask", ['intent' => 'watering_timing'])
            ->assertUnauthorized();
    }

    public function test_other_user_cannot_ask_the_assistant(): void
    {
        [, , $season] = $this->ownedSeason();
        $other = User::factory()->create();

        $this->actingAs($other)
            ->postJson("/api/v1/seasons/{$season->id}/assistant/ask", ['intent' => 'watering_timing'])
            ->assertForbidden();
    }

    public function test_rejects_unknown_intent_and_unsupported_fields(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $url = "/api/v1/seasons/{$season->id}/assistant/ask";

        $this->actingAs($owner)
            ->postJson($url, ['intent' => 'not_a_real_intent'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['intent'], 'error.fields');
        $this->actingAs($owner)
            ->postJson($url, ['intent' => 'watering_timing', 'unknown' => true])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['unknown'], 'error.fields');
    }

    public function test_watering_timing_answers_from_the_soonest_enabled_schedule(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        WateringSchedule::factory()->for($season, 'growingSeason')->create([
            'crop_id' => 'lettuce',
            'next_watering_at' => now()->addDays(2)->startOfDay(),
        ]);

        $response = $this->actingAs($owner)
            ->postJson("/api/v1/seasons/{$season->id}/assistant/ask", ['intent' => 'watering_timing'])
            ->assertOk()
            ->assertJsonPath('data.intent', 'watering_timing')
            ->assertJsonPath('data.actionPerformed', false)
            ->assertJsonPath('data.cropId', 'lettuce');

        $this->assertStringContainsString('상추', (string) $response->json('data.message'));
    }

    public function test_watering_timing_without_any_schedule_says_so_without_erroring(): void
    {
        [$owner, , $season] = $this->ownedSeason();

        $this->actingAs($owner)
            ->postJson("/api/v1/seasons/{$season->id}/assistant/ask", ['intent' => 'watering_timing'])
            ->assertOk()
            ->assertJsonPath('data.actionPerformed', false)
            ->assertJsonPath('data.cropId', null);
    }

    public function test_log_watering_completes_the_schedule_and_reports_the_next_date(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $schedule = WateringSchedule::factory()->for($season, 'growingSeason')->create([
            'crop_id' => 'lettuce',
            'interval_days' => 4,
            'next_watering_at' => '2026-05-01T00:00:00Z',
        ]);

        $this->actingAs($owner)
            ->postJson("/api/v1/seasons/{$season->id}/assistant/ask", ['intent' => 'log_watering'])
            ->assertOk()
            ->assertJsonPath('data.actionPerformed', true)
            ->assertJsonPath('data.cropId', 'lettuce');

        $this->assertDatabaseHas('watering_schedules', ['id' => $schedule->id, 'version' => 2]);
        $this->assertDatabaseCount('watering_logs', 1);
    }

    public function test_yellow_leaves_and_low_light_answer_without_a_schedule(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        $url = "/api/v1/seasons/{$season->id}/assistant/ask";

        $this->actingAs($owner)
            ->postJson($url, ['intent' => 'yellow_leaves'])
            ->assertOk()
            ->assertJsonPath('data.actionPerformed', false);
        $this->actingAs($owner)
            ->postJson($url, ['intent' => 'low_light'])
            ->assertOk()
            ->assertJsonPath('data.actionPerformed', false);
    }

    /** @return array{User, GrowingSpace, GrowingSeason} */
    private function ownedSeason(): array
    {
        $owner = User::factory()->create();
        $space = GrowingSpace::factory()->for($owner, 'owner')->create();
        $season = GrowingSeason::factory()->for($space, 'growingSpace')->create();

        return [$owner, $space, $season];
    }
}
