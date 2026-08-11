<?php

declare(strict_types=1);

namespace App\Domain\Seasons;

use App\Enums\GrowingSeasonStatus;
use App\Models\GrowingSeason;
use Carbon\CarbonImmutable;

final class ResolveGrowingSeasonStatus
{
    public static function for(GrowingSeason $season, ?CarbonImmutable $today = null): GrowingSeasonStatus
    {
        $today ??= CarbonImmutable::today((string) config('app.business_timezone'));
        $todayDate = $today->toDateString();
        $startDate = $season->start_date->toDateString();
        $endDate = $season->end_date->toDateString();

        if ($startDate > $todayDate) {
            return GrowingSeasonStatus::Planned;
        }

        if ($endDate < $todayDate) {
            return GrowingSeasonStatus::Completed;
        }

        return GrowingSeasonStatus::Active;
    }
}
