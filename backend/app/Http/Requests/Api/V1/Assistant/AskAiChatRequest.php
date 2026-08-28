<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Assistant;

use App\Http\Requests\Api\V1\StrictJsonRequest;

class AskAiChatRequest extends StrictJsonRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:500'],
        ];
    }

    public function message(): string
    {
        return (string) $this->validated('message');
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['message'];
    }
}
