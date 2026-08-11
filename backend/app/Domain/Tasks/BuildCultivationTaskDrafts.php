<?php

declare(strict_types=1);

namespace App\Domain\Tasks;

use App\Enums\CultivationTaskStatus;
use App\Enums\CultivationTaskType;
use App\Exceptions\ApiConflictException;
use App\Models\Crop;
use App\Models\GrowingSeason;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class BuildCultivationTaskDrafts
{
    /**
     * @param  Collection<int, Crop>  $crops
     * @return list<array<string, mixed>>
     */
    public function execute(GrowingSeason $season, Collection $crops): array
    {
        $drafts = [];

        foreach ($crops as $crop) {
            $plantingDate = $this->firstMatchingDate(
                $season->start_date,
                $season->end_date,
                $crop->planting_period,
            );
            if ($plantingDate === null) {
                $this->periodConflict($crop, '심는');
            }

            $harvestDate = $this->firstMatchingDate(
                $plantingDate,
                $season->end_date,
                $crop->harvest_period,
            );
            if ($harvestDate === null) {
                $this->periodConflict($crop, '수확');
            }

            $drafts[] = [
                'crop_id' => $crop->id,
                'type' => $this->plantingType($crop->planting_material),
                'title' => $this->plantingTitle($crop),
                'due_date' => $plantingDate->toDateString(),
                'notes' => "기준 심는 시기: {$crop->planting_period['label']}. 지역과 날씨에 따라 조정하세요.",
                'status' => CultivationTaskStatus::Pending,
                'completed_at' => null,
                'version' => 1,
            ];
            $drafts[] = [
                'crop_id' => $crop->id,
                'type' => CultivationTaskType::Harvest,
                'title' => "{$crop->name} 수확 시작하기",
                'due_date' => $harvestDate->toDateString(),
                'notes' => "기준 수확 시기: {$crop->harvest_period['label']}. 생육 상태와 날씨에 따라 조정하세요.",
                'status' => CultivationTaskStatus::Pending,
                'completed_at' => null,
                'version' => 1,
            ];
        }

        usort($drafts, static fn (array $left, array $right): int => $left['due_date'] <=> $right['due_date'] ?: strnatcmp($left['title'], $right['title']));

        return $drafts;
    }

    /** @param array{startMonth: int, endMonth: int, label: string} $period */
    private function firstMatchingDate(
        CarbonImmutable $startDate,
        CarbonImmutable $endDate,
        array $period,
    ): ?CarbonImmutable {
        for ($date = $startDate; $date->lte($endDate); $date = $date->addDay()) {
            $month = $date->month;
            $matches = $period['startMonth'] <= $period['endMonth']
                ? $month >= $period['startMonth'] && $month <= $period['endMonth']
                : $month >= $period['startMonth'] || $month <= $period['endMonth'];

            if ($matches) {
                return $date;
            }
        }

        return null;
    }

    private function plantingType(string $material): CultivationTaskType
    {
        return in_array($material, ['seed', 'seed-potato'], true)
            ? CultivationTaskType::Sowing
            : CultivationTaskType::Transplanting;
    }

    private function plantingTitle(Crop $crop): string
    {
        return match ($crop->planting_material) {
            'seedling' => "{$crop->name} 모종 심기",
            'seed-potato' => "{$crop->name} 씨감자 심기",
            'potted-plant' => "{$crop->name} 화분 자리 잡기",
            'cut-flower' => "{$crop->name} 꽃병에 꽂고 손질하기",
            default => "{$crop->name} 파종하기",
        };
    }

    private function periodConflict(Crop $crop, string $periodName): never
    {
        throw new ApiConflictException(
            'CROP_PERIOD_OUTSIDE_SEASON',
            "{$crop->name}의 권장 {$periodName} 시기와 시즌 기간이 겹치지 않습니다.",
        );
    }
}
