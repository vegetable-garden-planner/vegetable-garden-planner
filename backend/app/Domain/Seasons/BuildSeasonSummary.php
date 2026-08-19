<?php

declare(strict_types=1);

namespace App\Domain\Seasons;

use App\Enums\CultivationRecordType;
use App\Enums\CultivationTaskStatus;
use App\Models\GrowingSeason;

final class BuildSeasonSummary
{
    public static function for(GrowingSeason $season): SeasonSummary
    {
        $recordCountsByType = $season->records()
            ->selectRaw('type, count(*) as aggregate')
            ->groupBy('type')
            ->pluck('aggregate', 'type');

        $recordCounts = [];
        foreach (CultivationRecordType::cases() as $type) {
            $recordCounts[$type->value] = (int) ($recordCountsByType[$type->value] ?? 0);
        }

        $harvestTotals = $season->records()
            ->where('type', CultivationRecordType::Harvest->value)
            ->whereNotNull('unit')
            ->whereNotNull('quantity')
            ->selectRaw('unit, sum(quantity) as aggregate')
            ->groupBy('unit')
            ->orderBy('unit')
            ->get()
            ->map(static fn (object $row): array => [
                'unit' => (string) $row->unit,
                'quantity' => (float) $row->aggregate,
            ])
            ->all();

        return new SeasonSummary(
            seasonId: $season->id,
            status: ResolveGrowingSeasonStatus::for($season),
            recordCounts: $recordCounts,
            harvestTotals: $harvestTotals,
            taskTotal: $season->tasks()->count(),
            taskCompleted: $season->tasks()->where('status', CultivationTaskStatus::Completed->value)->count(),
        );
    }
}
