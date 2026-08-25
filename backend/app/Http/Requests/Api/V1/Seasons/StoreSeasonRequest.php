<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Seasons;

use App\Models\GrowingSpace;
use Illuminate\Support\Str;

class StoreSeasonRequest extends GrowingSeasonRequest
{
    public function authorize(): bool
    {
        $spaceId = $this->input('spaceId');
        if (! is_string($spaceId) || ! Str::isUuid($spaceId)) {
            return true;
        }

        $space = GrowingSpace::query()->findOrFail($spaceId);

        return $this->user()?->can('view', $space) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->fieldRules(true);
    }
}
