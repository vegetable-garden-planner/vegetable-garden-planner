<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CultivationRecordResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'seasonId' => $this->resource->growing_season_id,
            'type' => $this->resource->type->value,
            'occurredAt' => $this->resource->occurred_at->toISOString(),
            'notes' => $this->resource->notes,
            'quantity' => $this->resource->quantity === null
                ? null
                : (float) $this->resource->quantity,
            'unit' => $this->resource->unit,
            'version' => $this->resource->version,
            'createdAt' => $this->resource->created_at->toISOString(),
            'updatedAt' => $this->resource->updated_at->toISOString(),
        ];
    }
}
