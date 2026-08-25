<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContainerPlacementResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'seasonId' => $this->resource->growing_season_id,
            'spaceId' => $this->resource->growing_space_id,
            'cropId' => $this->resource->crop_id,
            'quantity' => $this->resource->quantity,
            'position' => $this->resource->position,
        ];
    }
}
