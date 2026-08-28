<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * @return array{id: string, email: string, nickname: string, role: string, createdAt: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'email' => $this->resource->email,
            'nickname' => $this->resource->nickname,
            'role' => $this->resource->role->value,
            'createdAt' => $this->resource->created_at->toISOString(),
        ];
    }
}
