<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Records;

use App\Enums\CultivationRecordType;
use App\Http\Requests\Api\V1\PaginationRequest;
use Illuminate\Validation\Rule;

class IndexRecordRequest extends PaginationRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'type' => ['sometimes', 'string', Rule::enum(CultivationRecordType::class)],
        ];
    }

    public function type(): ?string
    {
        return $this->has('type') ? $this->string('type')->toString() : null;
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['page', 'perPage', 'type'];
    }
}
