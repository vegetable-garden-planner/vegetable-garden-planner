<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GrowingSpaceResource extends JsonResource
{
    /**
     * @return array<string, int|string>
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
            'notes' => $this->resource->notes,
            'version' => $this->resource->version,
            'createdAt' => $this->resource->created_at->toISOString(),
            'updatedAt' => $this->resource->updated_at->toISOString(),
        ];
    }
}
