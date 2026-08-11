<?php

declare(strict_types=1);

namespace App\Actions\Seasons;

use App\Exceptions\ApiConflictException;
use App\Models\GrowingSeason;

final class EnsureSeasonPeriodAvailable
{
    public function execute(
        string $spaceId,
        string $startDate,
        string $endDate,
        ?string $ignoredSeasonId = null,
    ): void {
        $overlapExists = GrowingSeason::query()
            ->where('growing_space_id', $spaceId)
            ->whereDate('start_date', '<=', $endDate)
            ->whereDate('end_date', '>=', $startDate)
            ->when(
                $ignoredSeasonId !== null,
                fn ($query) => $query->whereKeyNot($ignoredSeasonId),
            )
            ->exists();

        if ($overlapExists) {
            throw new ApiConflictException(
                'SEASON_PERIOD_OVERLAP',
                '같은 공간에 기간이 겹치는 재배 시즌이 있습니다.',
            );
        }
    }
}
