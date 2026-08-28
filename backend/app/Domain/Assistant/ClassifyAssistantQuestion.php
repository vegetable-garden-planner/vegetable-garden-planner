<?php

declare(strict_types=1);

namespace App\Domain\Assistant;

use App\Enums\GardenAssistantIntent;

final class ClassifyAssistantQuestion
{
    /**
     * @param  array<string, string>  $cropNamesById  crop id => 한글 이름
     * @return array{intent: ?GardenAssistantIntent, cropId: ?string}
     */
    public static function classify(string $message, array $cropNamesById): array
    {
        return [
            'intent' => self::matchIntent($message),
            'cropId' => self::matchCropId($message, $cropNamesById),
        ];
    }

    private static function matchIntent(string $message): ?GardenAssistantIntent
    {
        // ponytail: 키워드 매칭, 오분류 시 App::classify() 재조정. 자유 텍스트 LLM 도입 시 교체
        return match (true) {
            self::containsAny($message, ['노래', '노랗', '누렇', '누레']) => GardenAssistantIntent::YellowLeaves,
            self::containsAny($message, ['햇빛', '볕', '광량']) => GardenAssistantIntent::LowLight,
            self::containsAny($message, ['물주기', '물 주', '물줘', '물 줘', '물 언제', '언제 물']) => GardenAssistantIntent::WateringTiming,
            default => null,
        };
    }

    /** @param array<string, string> $cropNamesById */
    private static function matchCropId(string $message, array $cropNamesById): ?string
    {
        foreach ($cropNamesById as $cropId => $name) {
            if ($name !== '' && str_contains($message, $name)) {
                return $cropId;
            }
        }

        return null;
    }

    /** @param list<string> $needles */
    private static function containsAny(string $message, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($message, $needle)) {
                return true;
            }
        }

        return false;
    }
}
