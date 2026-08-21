<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Billing;

use App\Http\Requests\Api\V1\StrictJsonRequest;

class StoreSubscriptionRequest extends StrictJsonRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'billing_key' => ['required', 'string', 'max:255'],
        ];
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['billing_key'];
    }
}
