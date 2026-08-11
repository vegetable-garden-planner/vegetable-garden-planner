<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WateringSnoozeResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'scheduleId' => $this->resource->watering_schedule_id,
            'originalAt' => $this->resource->original_at->toISOString(),
            'snoozedUntil' => $this->resource->snoozed_until->toISOString(),
            'createdAt' => $this->resource->created_at->toISOString(),
        ];
    }
}
