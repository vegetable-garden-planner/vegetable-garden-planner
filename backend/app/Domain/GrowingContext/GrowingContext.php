<?php

declare(strict_types=1);

namespace App\Domain\GrowingContext;

use App\Models\ContainerPlacement;
use App\Models\CultivationRecord;
use App\Models\CultivationTask;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\SpaceMemo;
use Illuminate\Support\Collection;

final class GrowingContext
{
    /**
     * @param  Collection<int, GrowingSpace>  $spaces
     * @param  Collection<int, GrowingSeason>  $seasons
     * @param  Collection<int, ContainerPlacement>  $containerPlacements
     * @param  Collection<int, GardenLayout>  $gardenLayouts
     * @param  Collection<int, CultivationRecord>  $recentRecords
     * @param  Collection<int, SpaceMemo>  $memos
     * @param  Collection<int, CultivationTask>  $upcomingTasks
     */
    public function __construct(
        public readonly Collection $spaces,
        public readonly Collection $seasons,
        public readonly Collection $containerPlacements,
        public readonly Collection $gardenLayouts,
        public readonly Collection $recentRecords,
        public readonly Collection $memos,
        public readonly Collection $upcomingTasks,
    ) {}
}
