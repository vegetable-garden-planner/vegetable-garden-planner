<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CropResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'name' => $this->resource->name,
            'familyName' => $this->resource->family_name,
            'category' => $this->resource->category,
            'difficulty' => $this->resource->difficulty,
            'plantingMaterial' => $this->resource->planting_material,
            'supportedSpaces' => $this->resource->supported_spaces,
            'plantingPeriod' => $this->resource->planting_period,
            'harvestPeriod' => $this->resource->harvest_period,
            'plantSpacingCm' => $this->resource->plant_spacing_cm,
            'minPotDepthCm' => $this->resource->min_pot_depth_cm,
            'sunRequirement' => $this->resource->sun_requirement,
            'needsSupport' => $this->resource->needs_support,
            'summary' => $this->resource->summary,
            'sourceId' => $this->resource->source_id,
            'careGuide' => $this->whenNotNull($this->resource->care_guide),
        ];
    }
}
