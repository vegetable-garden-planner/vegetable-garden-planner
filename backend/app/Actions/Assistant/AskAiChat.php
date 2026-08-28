<?php

declare(strict_types=1);

namespace App\Actions\Assistant;

use App\Domain\Assistant\ClassifyAssistantQuestion;
use App\Domain\GrowingContext\BuildGrowingContext;
use App\Models\Crop;
use App\Models\GrowingSeason;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

final class AskAiChat
{
    public function __construct(
        private readonly AskGardenAssistant $askGardenAssistant,
        private readonly AskGenerativeAssistant $askGenerativeAssistant,
    ) {}

    public function execute(User $user, string $message): string
    {
        $cropNamesById = Crop::query()->pluck('name', 'id')->all();
        $classified = ClassifyAssistantQuestion::classify($message, $cropNamesById);

        $season = $this->resolveCurrentSeason($user);

        if ($classified['intent'] !== null && $season !== null) {
            $answer = $this->askGardenAssistant->execute(
                $season,
                $user,
                $classified['intent'],
                $classified['cropId'],
            );

            return $answer->message;
        }

        $context = BuildGrowingContext::for($user);
        if ($context->spaces->isEmpty()) {
            return '등록된 텃밭·화분 공간이 아직 없어요. 공간과 시즌을 먼저 만들면 질문에 답해드릴게요.';
        }

        return $this->askGenerativeAssistant->execute($context, $cropNamesById, $message);
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
