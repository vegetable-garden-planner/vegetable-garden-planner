<?php

declare(strict_types=1);

namespace App\Actions\Assistant;

use App\Domain\GrowingContext\GrowingContext;
use App\Models\CultivationTask;
use App\Models\GardenLayout;
use App\Models\GrowingSpace;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class AskGenerativeAssistant
{
    private const MAX_OUTPUT_TOKENS = 300;

    private const TIMEOUT_SECONDS = 10;

    private const FALLBACK_ANSWER = '지금은 답변을 가져오지 못했어요. 잠시 후 다시 물어봐 주시거나, '
        .'"물 언제 줘?", "잎이 노래져요", "햇빛이 부족한가요?" 같은 질문으로 다시 시도해 보세요.';

    /** @param array<string, string> $cropNamesById */
    public function execute(GrowingContext $context, array $cropNamesById, string $message): string
    {
        $apiKey = config('services.gemini.key');
        $models = config('services.gemini.models');
        if (blank($apiKey) || $models === []) {
            return self::FALLBACK_ANSWER;
        }

        $systemPrompt = $this->buildSystemPrompt($context, $cropNamesById);

        foreach ($models as $model) {
            $answer = $this->callModel($model, $apiKey, $systemPrompt, $message);
            if ($answer !== null) {
                return $answer;
            }
        }

        return self::FALLBACK_ANSWER;
    }

    /**
     * @return string|null 성공하면 답변 텍스트, 이 모델로는 답을 못 얻었으면(할당량 초과 등) null —
     *                     호출자가 다음 모델로 넘어간다.
     */
    private function callModel(string $model, string $apiKey, string $systemPrompt, string $message): ?string
    {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)->post($url, [
                'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
                'contents' => [['parts' => [['text' => $message]]]],
                'generationConfig' => [
                    'maxOutputTokens' => self::MAX_OUTPUT_TOKENS,
                    'temperature' => 0.4,
                ],
            ]);
        } catch (ConnectionException $exception) {
            Log::warning('Gemini API 호출 실패(연결)', ['model' => $model, 'message' => $exception->getMessage()]);

            return null;
        }

        if ($response->failed()) {
            Log::warning('Gemini API 호출 실패(응답)', ['model' => $model, 'status' => $response->status()]);

            return null;
        }

        $answer = $response->json('candidates.0.content.parts.0.text');
        if (! is_string($answer) || trim($answer) === '') {
            Log::warning('Gemini API 응답에 답변 텍스트 없음', [
                'model' => $model,
                'blockReason' => $response->json('promptFeedback.blockReason'),
            ]);

            return null;
        }

        return trim($answer);
    }

    /** @param array<string, string> $cropNamesById */
    private function buildSystemPrompt(GrowingContext $context, array $cropNamesById): string
    {
        $spaceSummary = $context->spaces
            ->map(fn (GrowingSpace $space): string => "- {$space->name} ({$space->type->value})")
            ->implode("\n");

        $cropIds = collect()
            ->merge($context->containerPlacements->pluck('crop_id'))
            ->merge($context->gardenLayouts->flatMap(
                fn (GardenLayout $layout) => $layout->placements->pluck('crop_id'),
            ))
            ->filter()
            ->unique();

        $cropSummary = $cropIds
            ->map(fn (string $id): ?string => $cropNamesById[$id] ?? null)
            ->filter()
            ->unique()
            ->implode(', ');

        $taskSummary = $context->upcomingTasks
            ->take(5)
            ->map(fn (CultivationTask $task): string => "- {$task->title} ({$task->due_date->toDateString()})")
            ->implode("\n");

        $spaceSummary = $spaceSummary !== '' ? $spaceSummary : '등록된 공간 없음';
        $cropSummary = $cropSummary !== '' ? $cropSummary : '등록된 작물 없음';
        $taskSummary = $taskSummary !== '' ? $taskSummary : '없음';

        return <<<PROMPT
            너는 텃밭·화분 채소 재배를 돕는 한국어 재배 도우미야. 아래는 지금 이 사용자의 실제 재배 정보다.

            보유 공간:
            {$spaceSummary}

            현재 심은 작물: {$cropSummary}

            다가오는 할 일:
            {$taskSummary}

            답변 규칙:
            - 위 정보에 없는 사용자의 구체적인 수치·날짜·상태를 지어내서 답하지 마라. 모르면 모른다고 말해라.
            - 일반적인 재배 지식(물주기 원칙, 병충해 대처 등)은 알고 있는 대로 답해도 된다.
            - 답은 한국어로, 3~4문장 이내로 간결하게 써라.
            PROMPT;
    }
}
