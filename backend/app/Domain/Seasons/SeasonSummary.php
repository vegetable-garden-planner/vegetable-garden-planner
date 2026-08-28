<?php

declare(strict_types=1);

namespace App\Domain\Seasons;

use App\Enums\GrowingSeasonStatus;

final class SeasonSummary
{
    /**
     * @param  array<string, int>  $recordCounts
     * @param  list<array{unit: string, quantity: float}>  $harvestTotals
     */
    public function __construct(
        public readonly string $seasonId,
        public readonly GrowingSeasonStatus $status,
        public readonly array $recordCounts,
        public readonly array $harvestTotals,
        public readonly int $taskTotal,
        public readonly int $taskCompleted,
    ) {}
}
