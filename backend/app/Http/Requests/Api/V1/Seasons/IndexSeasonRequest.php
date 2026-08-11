<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Seasons;

use App\Enums\GrowingSeasonStatus;
use App\Http\Requests\Api\V1\PaginationRequest;
use Illuminate\Validation\Rule;

class IndexSeasonRequest extends PaginationRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'spaceId' => ['sometimes', 'string', 'uuid'],
            'status' => ['sometimes', 'string', Rule::enum(GrowingSeasonStatus::class)],
        ];
    }

    public function spaceId(): ?string
    {
        return $this->has('spaceId') ? $this->string('spaceId')->toString() : null;
    }

    public function status(): ?GrowingSeasonStatus
    {
        $value = $this->string('status')->toString();

        return $value === '' ? null : GrowingSeasonStatus::from($value);
    }

    protected function allowedFields(): array
    {
        return ['page', 'perPage', 'spaceId', 'status'];
    }
}
