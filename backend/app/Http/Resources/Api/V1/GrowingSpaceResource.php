<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GrowingSpaceResource extends JsonResource
{
    /**
     * @return array<string, float|int|string|null>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'name' => $this->resource->name,
            'type' => $this->resource->type->value,
            'sunlight' => $this->resource->sunlight->value,
            'widthCm' => $this->resource->width_cm,
            'lengthCm' => $this->resource->length_cm,
            'region' => $this->resource->region,
            'address' => $this->resource->address,
            'latitude' => $this->resource->latitude === null ? null : (float) $this->resource->latitude,
            'longitude' => $this->resource->longitude === null ? null : (float) $this->resource->longitude,
            'orientation' => $this->resource->orientation?->value,
            'estimatedSunlightHours' => $this->resource->estimated_sunlight_hours === null
                ? null
                : (float) $this->resource->estimated_sunlight_hours,
            'notes' => $this->resource->notes,
            'version' => $this->resource->version,
            'createdAt' => $this->resource->created_at->toISOString(),
            'updatedAt' => $this->resource->updated_at->toISOString(),
        ];
    }
}
