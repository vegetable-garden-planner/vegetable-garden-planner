<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CultivationTaskResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'seasonId' => $this->resource->growing_season_id,
            'cropId' => $this->resource->crop_id,
            'type' => $this->resource->type->value,
            'title' => $this->resource->title,
            'dueDate' => $this->resource->due_date->toDateString(),
            'notes' => $this->resource->notes,
            'status' => $this->resource->status->value,
            'completedAt' => $this->resource->completed_at?->toISOString(),
            'version' => $this->resource->version,
            'createdAt' => $this->resource->created_at->toISOString(),
            'updatedAt' => $this->resource->updated_at->toISOString(),
        ];
    }
}
