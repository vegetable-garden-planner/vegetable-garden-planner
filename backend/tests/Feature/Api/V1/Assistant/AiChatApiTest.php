<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Assistant;

use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use App\Models\WateringSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiChatApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_use_the_chat(): void
    {
        $this->postJson('/api/v1/ai/chat', ['message' => '상추 물 언제 줘?'])
            ->assertUnauthorized();
    }

    public function test_rejects_missing_message_and_unsupported_fields(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/ai/chat', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['message'], 'error.fields');
        $this->actingAs($user)
            ->postJson('/api/v1/ai/chat', ['message' => '안녕', 'seasonId' => 'x'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['seasonId'], 'error.fields');
    }

    public function test_answers_from_the_users_active_season_without_a_season_id(): void
    {
        [$owner, , $season] = $this->ownedSeason();
        WateringSchedule::factory()->for($season, 'growingSeason')->create([
            'crop_id' => 'lettuce',
            'next_watering_at' => now()->addDays(2)->startOfDay(),
        ]);

        $response = $this->actingAs($owner)
            ->postJson('/api/v1/ai/chat', ['message' => '상추 물 언제 줘?'])
            ->assertOk();

        $this->assertStringContainsString('상추', (string) $response->json('data.answer'));
    }

    public function test_classifies_yellow_leaves_and_low_light_questions(): void
    {
        [$owner] = $this->ownedSeason();

        $this->actingAs($owner)
            ->postJson('/api/v1/ai/chat', ['message' => '잎이 노래지고 있어요'])
            ->assertOk()
            ->assertJsonPath('data.answer', fn (string $answer): bool => str_contains($answer, '노래지는'));

        $this->actingAs($owner)
            ->postJson('/api/v1/ai/chat', ['message' => '햇빛이 부족한가요?'])
            ->assertOk()
            ->assertJsonPath('data.answer', fn (string $answer): bool => str_contains($answer, '빛'));
    }

    public function test_unrecognized_question_returns_a_graceful_fallback(): void
    {
        [$owner] = $this->ownedSeason();

        $this->actingAs($owner)
            ->postJson('/api/v1/ai/chat', ['message' => '오늘 저녁 뭐 먹지'])
            ->assertOk()
            ->assertJsonPath('data.answer', fn (string $answer): bool => str_contains($answer, '아직 답할 수 있는 질문이 아니에요'));
    }

    public function test_user_without_any_season_gets_a_setup_hint(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/ai/chat', ['message' => '상추 물 언제 줘?'])
            ->assertOk()
            ->assertJsonPath('data.answer', fn (string $answer): bool => str_contains($answer, '공간과 시즌을 먼저'));
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
