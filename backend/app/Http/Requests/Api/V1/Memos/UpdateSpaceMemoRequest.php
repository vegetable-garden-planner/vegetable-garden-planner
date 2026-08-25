<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Memos;

use App\Models\SpaceMemo;
use Illuminate\Validation\Validator;

class UpdateSpaceMemoRequest extends SpaceMemoRequest
{
    public function authorize(): bool
    {
        $memo = $this->route('spaceMemo');

        return $memo instanceof SpaceMemo && $this->user()?->can('update', $memo) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->memoRules('sometimes');
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if (array_intersect(array_keys($this->all()), $this->allowedFields()) === []) {
                    $validator->errors()->add('memo', '수정할 필드를 하나 이상 입력해 주세요.');
                }
            },
        ];
    }
}
