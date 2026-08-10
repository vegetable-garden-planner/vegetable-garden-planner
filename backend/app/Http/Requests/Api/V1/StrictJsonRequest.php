<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

abstract class StrictJsonRequest extends FormRequest
{
    /**
     * @return list<string>
     */
    abstract protected function allowedFields(): array;

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $unexpectedFields = array_diff(array_keys($this->all()), $this->allowedFields());

            foreach ($unexpectedFields as $field) {
                $validator->errors()->add($field, '지원하지 않는 필드입니다.');
            }
        }];
    }
}
