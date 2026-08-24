<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\ContainerPlacement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContainerPlacementsResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $season = $this->resource['season'];
        $placements = $this->resource['placements'];

        return [
            'seasonId' => $season->id,
            'placements' => $placements->map(static fn (ContainerPlacement $placement): array => [
                'id' => $placement->id,
                'spaceId' => $placement->growing_space_id,
                'cropId' => $placement->crop_id,
                'quantity' => $placement->quantity,
                'position' => $placement->position,
            ])->values()->all(),
            'version' => $season->version,
        ];
    }
}
