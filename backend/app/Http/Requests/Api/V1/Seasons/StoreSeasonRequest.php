<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Seasons;

class StoreSeasonRequest extends GrowingSeasonRequest
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
        return $this->fieldRules(true);
    }
}
