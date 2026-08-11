<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

class PaginationRequest extends StrictJsonRequest
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
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'perPage' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function perPage(): int
    {
        return $this->integer('perPage', 20);
    }

    protected function allowedFields(): array
    {
        return ['page', 'perPage'];
    }
}
