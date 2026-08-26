<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Assistant;

use App\Enums\GardenAssistantIntent;
use App\Http\Requests\Api\V1\StrictJsonRequest;
use App\Models\GrowingSeason;
use Illuminate\Validation\Rule;

class AskGardenAssistantRequest extends StrictJsonRequest
{
    public function authorize(): bool
    {
        $season = $this->route('growingSeason');

        return $season instanceof GrowingSeason && $this->user()?->can('update', $season) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'intent' => ['required', 'string', Rule::enum(GardenAssistantIntent::class)],
            'cropId' => ['nullable', 'string', 'exists:crops,id'],
        ];
    }

    public function intent(): GardenAssistantIntent
    {
        return GardenAssistantIntent::from((string) $this->validated('intent'));
    }

    public function cropId(): ?string
    {
        $cropId = $this->validated('cropId');

        return $cropId === null ? null : (string) $cropId;
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['intent', 'cropId'];
    }
}
