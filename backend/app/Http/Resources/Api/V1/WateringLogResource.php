<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WateringLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'scheduleId' => $this->resource->watering_schedule_id,
            'userId' => $this->resource->user_id,
            'scheduledFor' => $this->resource->scheduled_for->toISOString(),
            'wateredAt' => $this->resource->watered_at->toISOString(),
            'amountMl' => $this->resource->amount_ml,
            'memo' => $this->resource->memo,
            'createdAt' => $this->resource->created_at->toISOString(),
        ];
    }
}
