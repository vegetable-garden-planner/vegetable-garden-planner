<?php

declare(strict_types=1);

namespace App\Actions\Assistant;

use App\Domain\Assistant\ClassifyAssistantQuestion;
use App\Models\Crop;
use App\Models\GrowingSeason;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

final class AskAiChat
{
    public function __construct(
        private readonly AskGardenAssistant $askGardenAssistant,
    ) {}

    public function execute(User $user, string $message): string
    {
        $season = $this->resolveCurrentSeason($user);
        if ($season === null) {
            return '등록된 텃밭·화분 공간이 아직 없어요. 공간과 시즌을 먼저 만들면 질문에 답해드릴게요.';
        }

        $cropNamesById = Crop::query()->pluck('name', 'id')->all();
        $classified = ClassifyAssistantQuestion::classify($message, $cropNamesById);

        if ($classified['intent'] === null) {
            return '아직 답할 수 있는 질문이 아니에요. "물 언제 줘?", "잎이 노래져요", "햇빛이 부족한가요?" 같은 질문을 해보세요.';
        }

        $answer = $this->askGardenAssistant->execute(
            $season,
            $user,
            $classified['intent'],
            $classified['cropId'],
        );

        return $answer->message;
    }

    private function resolveCurrentSeason(User $user): ?GrowingSeason
    {
        $today = CarbonImmutable::today((string) config('app.business_timezone'))->toDateString();

        $ownedSeasons = GrowingSeason::query()
            ->whereHas(
                'growingSpace',
                fn (Builder $query): Builder => $query->where('owner_id', $user->id),
            );

        $activeSeason = (clone $ownedSeasons)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->latest('start_date')
            ->first();

        return $activeSeason ?? $ownedSeasons->latest('start_date')->first();
    }
}
