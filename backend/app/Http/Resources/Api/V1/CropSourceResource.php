<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CropSourceResource extends JsonResource
{
    /** @return array<string, string> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'organization' => $this->resource->organization,
            'title' => $this->resource->title,
            'url' => $this->resource->url,
            'reviewedAt' => $this->resource->reviewed_at->toDateString(),
        ];
    }
}
