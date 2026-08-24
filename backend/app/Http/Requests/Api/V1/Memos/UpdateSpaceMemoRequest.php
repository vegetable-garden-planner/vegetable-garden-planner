<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Memos;

use Illuminate\Validation\Validator;

class UpdateSpaceMemoRequest extends SpaceMemoRequest
{
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
