<?php

declare(strict_types=1);

namespace App\Domain\GrowingContext;

use App\Enums\CultivationTaskStatus;
use App\Models\ContainerPlacement;
use App\Models\CultivationRecord;
use App\Models\CultivationTask;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\SpaceMemo;
use App\Models\User;

final class BuildGrowingContext
{
    private const RECENT_RECORDS_LIMIT = 20;

    private const UPCOMING_TASKS_LIMIT = 20;

    public static function for(User $user): GrowingContext
    {
        $ownedByUser = static fn ($query) => $query->where('owner_id', $user->id);

        $spaces = GrowingSpace::query()
            ->where('owner_id', $user->id)
            ->get();

        $seasons = GrowingSeason::query()
            ->whereHas('growingSpace', $ownedByUser)
            ->get();

        $containerPlacements = ContainerPlacement::query()
            ->whereHas('growingSeason.growingSpace', $ownedByUser)
            ->get();

        $gardenLayouts = GardenLayout::query()
            ->whereHas('growingSeason.growingSpace', $ownedByUser)
            ->with('placements')
            ->get();

        $recentRecords = CultivationRecord::query()
            ->whereHas('growingSeason.growingSpace', $ownedByUser)
            ->latest('occurred_at')
            ->limit(self::RECENT_RECORDS_LIMIT)
            ->get();

        $memos = SpaceMemo::query()
            ->whereHas('growingSpace', $ownedByUser)
            ->get();

        $upcomingTasks = CultivationTask::query()
            ->where('status', CultivationTaskStatus::Pending)
            ->whereHas('growingSeason.growingSpace', $ownedByUser)
            ->orderBy('due_date')
            ->limit(self::UPCOMING_TASKS_LIMIT)
            ->get();

        return new GrowingContext(
            spaces: $spaces,
            seasons: $seasons,
            containerPlacements: $containerPlacements,
            gardenLayouts: $gardenLayouts,
            recentRecords: $recentRecords,
            memos: $memos,
            upcomingTasks: $upcomingTasks,
        );
    }
}
