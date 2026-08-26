<?php

declare(strict_types=1);

namespace App\Actions\Assistant;

use App\Actions\Watering\CompleteWatering;
use App\Domain\Assistant\GardenAssistantAnswer;
use App\Enums\GardenAssistantIntent;
use App\Enums\SunlightExposure;
use App\Models\Crop;
use App\Models\GrowingSeason;
use App\Models\User;
use App\Models\WateringSchedule;
use App\Support\Http\EntityTag;
use Carbon\CarbonImmutable;

final class AskGardenAssistant
{
    public function __construct(
        private readonly CompleteWatering $completeWatering,
    ) {}

    public function execute(
        GrowingSeason $season,
        User $user,
        GardenAssistantIntent $intent,
        ?string $cropId,
    ): GardenAssistantAnswer {
        return match ($intent) {
            GardenAssistantIntent::WateringTiming => $this->answerWateringTiming($season, $cropId),
            GardenAssistantIntent::YellowLeaves => $this->answerYellowLeaves($season, $cropId),
            GardenAssistantIntent::LowLight => $this->answerLowLight($season, $cropId),
            GardenAssistantIntent::LogWatering => $this->performLogWatering($season, $user, $cropId),
        };
    }

    private function answerWateringTiming(GrowingSeason $season, ?string $cropId): GardenAssistantAnswer
    {
        $schedule = $this->resolveSchedule($season, $cropId);
        if ($schedule === null) {
            return new GardenAssistantAnswer(
                GardenAssistantIntent::WateringTiming,
                '아직 이 작물의 물주기 일정이 없어요. 물주기 일정을 먼저 만들어 두면 다음 물 줄 때를 알려드릴게요.',
                actionPerformed: false,
                cropId: $cropId,
            );
        }

        $cropName = $schedule->crop->name;
        $daysUntil = CarbonImmutable::now()->startOfDay()->diffInDays($schedule->next_watering_at->startOfDay(), false);

        $message = match (true) {
            ! $schedule->enabled => "{$cropName}의 물주기 일정이 꺼져 있어요.",
            $daysUntil < 0 => "{$cropName}은(는) 물 줄 때가 ".abs($daysUntil).'일 지났어요. 오늘 물을 주는 게 좋아요.',
            $daysUntil === 0 => "{$cropName}은(는) 오늘이 물 줄 날이에요.",
            default => "{$cropName}의 다음 물주기는 {$daysUntil}일 후예요 ({$schedule->next_watering_at->toDateString()}).",
        };

        return new GardenAssistantAnswer(
            GardenAssistantIntent::WateringTiming,
            $message,
            actionPerformed: false,
            cropId: $schedule->crop_id,
        );
    }

    private function answerYellowLeaves(GrowingSeason $season, ?string $cropId): GardenAssistantAnswer
    {
        $crop = $this->resolveCrop($season, $cropId);
        $schedule = $crop !== null ? $this->resolveSchedule($season, $crop->id) : null;
        $cropName = $crop?->name ?? '작물';

        $intervalHint = $schedule !== null
            ? "지금 물주기 간격은 {$schedule->interval_days}일로 설정되어 있어요. 그보다 흙이 자주 마른다면 과습보다는 물 부족일 수 있어요."
            : '물주기 일정을 등록해 두면 과습인지 물 부족인지 비교하기 더 쉬워요.';

        $message = "{$cropName}의 잎이 노래지는 흔한 원인은 과습(뿌리가 계속 젖어 있음), 배수 불량, 질소 부족, 빛 부족이에요. "
            .'먼저 화분 바닥에 물이 고여 있지 않은지, 겉흙이 마르기 전에 또 물을 주고 있지 않은지 확인해 보세요. '
            .$intervalHint;

        return new GardenAssistantAnswer(
            GardenAssistantIntent::YellowLeaves,
            $message,
            actionPerformed: false,
            cropId: $crop?->id,
        );
    }

    private function answerLowLight(GrowingSeason $season, ?string $cropId): GardenAssistantAnswer
    {
        $crop = $this->resolveCrop($season, $cropId);
        $space = $season->growingSpace;
        $cropName = $crop?->name ?? '작물';

        $needsFullSun = $crop?->category === 'fruit';
        $hours = $space->estimated_sunlight_hours;
        $spaceLabel = match ($space->sunlight) {
            SunlightExposure::Low => '햇빛이 적은 편',
            SunlightExposure::Partial => '햇빛이 어느 정도 드는 편',
            SunlightExposure::Full => '햇빛이 충분한 편',
            null => '일조 정보가 없는',
        };

        $hoursText = $hours !== null ? "하루 약 {$hours}시간" : $spaceLabel;

        if ($crop === null) {
            $message = "지금 공간은 {$hoursText}이에요. 어떤 작물인지 알려주시면 그 작물에 빛이 충분한지 더 정확히 답해드릴게요.";
        } elseif ($needsFullSun) {
            $message = $space->sunlight === SunlightExposure::Full
                ? "{$cropName}은(는) 햇빛을 많이 필요로 하는 열매 작물인데, 지금 공간은 {$hoursText}라 대체로 충분해요."
                : "{$cropName}은(는) 하루 6시간 이상 밝은 빛이 필요한 열매 작물이에요. 지금 공간은 {$hoursText}라 빛이 부족할 수 있어요. 가장 밝은 자리로 옮기거나 보조 재배등을 고려해 보세요.";
        } else {
            $message = "{$cropName}은(는) 잎채소·향채류라 빛에 비교적 덜 예민해요. 지금 공간({$hoursText})이면 대체로 자라는 데 무리가 없어요.";
        }

        return new GardenAssistantAnswer(
            GardenAssistantIntent::LowLight,
            $message,
            actionPerformed: false,
            cropId: $crop?->id,
        );
    }

    private function performLogWatering(GrowingSeason $season, User $user, ?string $cropId): GardenAssistantAnswer
    {
        $schedule = $this->resolveSchedule($season, $cropId);
        if ($schedule === null) {
            return new GardenAssistantAnswer(
                GardenAssistantIntent::LogWatering,
                '기록할 물주기 일정을 찾지 못했어요. 먼저 물주기 일정을 만들어 주세요.',
                actionPerformed: false,
                cropId: $cropId,
            );
        }

        $result = $this->completeWatering->execute(
            $schedule,
            $user,
            [
                'watered_at' => CarbonImmutable::now(),
                'amount_ml' => null,
                'memo' => '챗봇으로 기록',
            ],
            EntityTag::forVersion($schedule->version),
        );

        $cropName = $schedule->crop->name;
        $next = $result['schedule']->next_watering_at->toDateString();

        return new GardenAssistantAnswer(
            GardenAssistantIntent::LogWatering,
            "{$cropName} 물주기를 기록했어요. 다음 물주기는 {$next}이에요.",
            actionPerformed: true,
            cropId: $schedule->crop_id,
        );
    }

    private function resolveSchedule(GrowingSeason $season, ?string $cropId): ?WateringSchedule
    {
        return $season->wateringSchedules()
            ->with('crop')
            ->when($cropId !== null, fn ($query) => $query->where('crop_id', $cropId))
            ->orderByDesc('enabled')
            ->orderBy('next_watering_at')
            ->first();
    }

    private function resolveCrop(GrowingSeason $season, ?string $cropId): ?Crop
    {
        if ($cropId !== null) {
            return Crop::find($cropId);
        }

        $schedule = $this->resolveSchedule($season, null);
        if ($schedule !== null) {
            return $schedule->crop;
        }

        $placement = $season->containerPlacements()->with('crop')->first();

        return $placement?->crop;
    }
}
