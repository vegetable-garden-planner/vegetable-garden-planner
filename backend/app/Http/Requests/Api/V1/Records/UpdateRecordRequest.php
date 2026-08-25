<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Records;

use App\Models\CultivationRecord;
use Illuminate\Validation\Validator;

class UpdateRecordRequest extends CultivationRecordRequest
{
    public function authorize(): bool
    {
        $record = $this->route('cultivationRecord');

        return $record instanceof CultivationRecord && $this->user()?->can('update', $record) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->recordRules('sometimes');
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if (array_intersect(array_keys($this->all()), $this->allowedFields()) === []) {
                    $validator->errors()->add('record', '수정할 필드를 하나 이상 입력해 주세요.');
                }
            },
        ];
    }
}
