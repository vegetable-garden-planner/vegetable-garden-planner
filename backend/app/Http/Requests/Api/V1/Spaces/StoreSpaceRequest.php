<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Spaces;

class StoreSpaceRequest extends GrowingSpaceRequest
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
        return $this->fieldRules('required');
    }
}
