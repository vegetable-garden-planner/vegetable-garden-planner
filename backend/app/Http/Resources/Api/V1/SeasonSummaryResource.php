<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Domain\Seasons\SeasonSummary;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SeasonSummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var SeasonSummary $summary */
        $summary = $this->resource;

        return [
            'seasonId' => $summary->seasonId,
            'status' => $summary->status->value,
            'recordCounts' => $summary->recordCounts,
            'harvestTotals' => $summary->harvestTotals,
            'taskCompletion' => [
                'total' => $summary->taskTotal,
                'completed' => $summary->taskCompleted,
                'rate' => $summary->taskTotal > 0
                    ? round($summary->taskCompleted / $summary->taskTotal, 4)
                    : null,
            ],
            'generatedAt' => now()->toISOString(),
        ];
    }
}
