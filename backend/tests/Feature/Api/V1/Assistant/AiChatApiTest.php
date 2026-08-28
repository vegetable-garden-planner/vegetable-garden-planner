<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Assistant;

use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use App\Models\WateringSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
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

    public function test_unrecognized_question_without_a_gemini_key_returns_a_graceful_fallback(): void
    {
        config(['services.gemini.key' => null]);
        [$owner] = $this->ownedSeason();

        $this->actingAs($owner)
            ->postJson('/api/v1/ai/chat', ['message' => '오늘 저녁 뭐 먹지'])
            ->assertOk()
            ->assertJsonPath('data.answer', fn (string $answer): bool => str_contains($answer, '답변을 가져오지 못했어요'));
    }

    public function test_unrecognized_question_asks_gemini_and_returns_its_answer(): void
    {
        config(['services.gemini.key' => 'test-key']);
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => '일반적으로 흙 표면이 마르면 물을 주면 돼요.']]]],
                ],
            ]),
        ]);
        [$owner] = $this->ownedSeason();

        $this->actingAs($owner)
            ->postJson('/api/v1/ai/chat', ['message' => '오늘 저녁 뭐 먹지'])
            ->assertOk()
            ->assertJsonPath('data.answer', '일반적으로 흙 표면이 마르면 물을 주면 돼요.');

        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'generativelanguage.googleapis.com')
            && $request['contents'][0]['parts'][0]['text'] === '오늘 저녁 뭐 먹지');
    }

    public function test_gemini_failure_returns_a_graceful_fallback_instead_of_an_error(): void
    {
        config(['services.gemini.key' => 'test-key']);
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response(['error' => 'rate limited'], 429),
        ]);
        [$owner] = $this->ownedSeason();

        $this->actingAs($owner)
            ->postJson('/api/v1/ai/chat', ['message' => '오늘 저녁 뭐 먹지'])
            ->assertOk()
            ->assertJsonPath('data.answer', fn (string $answer): bool => str_contains($answer, '답변을 가져오지 못했어요'));
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
