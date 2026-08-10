<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Domain\Seasons\ResolveGrowingSeasonStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GrowingSeasonResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'spaceId' => $this->resource->growing_space_id,
            'name' => $this->resource->name,
            'startDate' => $this->resource->start_date->toDateString(),
            'endDate' => $this->resource->end_date->toDateString(),
            'notes' => $this->resource->notes,
            'featuredCropId' => $this->whenNotNull($this->resource->featured_crop_id),
            'status' => ResolveGrowingSeasonStatus::for($this->resource)->value,
            'version' => $this->resource->version,
            'createdAt' => $this->resource->created_at->toISOString(),
            'updatedAt' => $this->resource->updated_at->toISOString(),
        ];
    }
}
