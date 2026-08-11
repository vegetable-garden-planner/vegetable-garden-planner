<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GardenLayoutResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'seasonId' => $this->resource->growing_season_id,
            'spaceId' => $this->resource->growing_space_id,
            'spaceWidthCm' => $this->resource->space_width_cm,
            'spaceLengthCm' => $this->resource->space_length_cm,
            'cellSizeCm' => $this->resource->cell_size_cm,
            'columns' => $this->resource->columns,
            'rows' => $this->resource->rows,
            'placements' => $this->resource->placements->map(
                static fn ($placement): array => [
                    'cellIndex' => $placement->cell_index,
                    'cropId' => $placement->crop_id,
                ],
            )->values()->all(),
            'version' => $this->resource->version,
            'updatedAt' => $this->resource->updated_at->toISOString(),
        ];
    }
}
