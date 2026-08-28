<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Records;

class StoreRecordRequest extends CultivationRecordRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...$this->recordRules('required'),
            'notes' => ['present', 'nullable', 'string', 'max:2000'],
        ];
    }
}
