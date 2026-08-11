<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Tasks;

use App\Enums\CultivationTaskStatus;
use App\Http\Requests\Api\V1\PaginationRequest;
use Illuminate\Validation\Rule;

class IndexTaskRequest extends PaginationRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'status' => ['sometimes', 'string', Rule::enum(CultivationTaskStatus::class)],
        ];
    }

    public function status(): ?string
    {
        return $this->has('status') ? $this->string('status')->toString() : null;
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['page', 'perPage', 'status'];
    }
}
