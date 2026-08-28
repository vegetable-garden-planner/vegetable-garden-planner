<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    /**
     * @return array<string, int|string|null>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'planCode' => $this->resource->plan_code,
            'status' => $this->resource->status->value,
            'currentPeriodStart' => $this->resource->current_period_start->toISOString(),
            'currentPeriodEnd' => $this->resource->current_period_end->toISOString(),
            'canceledAt' => $this->resource->canceled_at?->toISOString(),
            'version' => $this->resource->version,
        ];
    }
}
