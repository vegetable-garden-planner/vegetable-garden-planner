<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Domain\GrowingContext\GrowingContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GrowingContextResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var GrowingContext $context */
        $context = $this->resource;

        return [
            'spaces' => GrowingSpaceResource::collection($context->spaces)->resolve(),
            'seasons' => GrowingSeasonResource::collection($context->seasons)->resolve(),
            'containerPlacements' => ContainerPlacementResource::collection($context->containerPlacements)->resolve(),
            'gardenLayouts' => GardenLayoutResource::collection($context->gardenLayouts)->resolve(),
            'recentRecords' => CultivationRecordResource::collection($context->recentRecords)->resolve(),
            'memos' => SpaceMemoResource::collection($context->memos)->resolve(),
            'upcomingTasks' => CultivationTaskResource::collection($context->upcomingTasks)->resolve(),
            'generatedAt' => now()->toISOString(),
        ];
    }
}
