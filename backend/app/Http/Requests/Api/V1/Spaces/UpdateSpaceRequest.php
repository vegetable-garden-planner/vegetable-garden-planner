<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Spaces;

use Illuminate\Validation\Validator;

class UpdateSpaceRequest extends GrowingSpaceRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->fieldRules('sometimes');
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                $hasKnownField = collect($this->allowedFields())
                    ->contains(fn (string $field): bool => $this->exists($field));

                if (! $hasKnownField) {
                    $validator->errors()->add('_request', '수정할 필드를 하나 이상 입력해 주세요.');
                }
            },
        ];
    }
}
