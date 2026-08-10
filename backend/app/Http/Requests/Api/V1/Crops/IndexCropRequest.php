<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Crops;

use App\Http\Requests\Api\V1\PaginationRequest;
use Illuminate\Validation\Rule;

class IndexCropRequest extends PaginationRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'query' => ['sometimes', 'string', 'max:100'],
            'category' => ['sometimes', 'string', Rule::in(['leaf', 'fruit', 'root', 'legume', 'tuber', 'flower'])],
            'space' => ['sometimes', 'string', Rule::in(['indoor', 'balcony', 'garden'])],
        ];
    }

    public function queryText(): string
    {
        return trim($this->string('query')->toString());
    }

    public function category(): ?string
    {
        return $this->has('category') ? $this->string('category')->toString() : null;
    }

    public function space(): ?string
    {
        return $this->has('space') ? $this->string('space')->toString() : null;
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['page', 'perPage', 'query', 'category', 'space'];
    }
}
