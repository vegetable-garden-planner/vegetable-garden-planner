<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WateringScheduleResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'seasonId' => $this->resource->growing_season_id,
            'cropId' => $this->resource->crop_id,
            'intervalDays' => $this->resource->interval_days,
            'nextWateringAt' => $this->resource->next_watering_at->toISOString(),
            'enabled' => $this->resource->enabled,
            'version' => $this->resource->version,
            'createdAt' => $this->resource->created_at->toISOString(),
            'updatedAt' => $this->resource->updated_at->toISOString(),
        ];
    }
}
