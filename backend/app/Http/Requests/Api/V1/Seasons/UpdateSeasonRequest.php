<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Seasons;

use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;

class UpdateSeasonRequest extends GrowingSeasonRequest
{
    public function authorize(): bool
    {
        $season = $this->route('growingSeason');
        if (! $season instanceof GrowingSeason || $this->user()?->can('update', $season) !== true) {
            return false;
        }

        return $this->authorizeTargetSpace($season);
    }

    private function authorizeTargetSpace(GrowingSeason $season): bool
    {
        $targetSpaceId = $this->input('spaceId');
        if (! is_string($targetSpaceId) || ! Str::isUuid($targetSpaceId) || $targetSpaceId === $season->growing_space_id) {
            return true;
        }

        $targetSpace = GrowingSpace::query()->findOrFail($targetSpaceId);

        return $this->user()?->can('view', $targetSpace) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->fieldRules(false);
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
