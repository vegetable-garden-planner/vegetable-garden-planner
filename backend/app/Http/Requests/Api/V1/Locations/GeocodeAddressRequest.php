<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Locations;

use Illuminate\Foundation\Http\FormRequest;

class GeocodeAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['address' => ['required', 'string', 'min:2', 'max:255']];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['address' => trim((string) $this->query('address'))]);
    }
}
