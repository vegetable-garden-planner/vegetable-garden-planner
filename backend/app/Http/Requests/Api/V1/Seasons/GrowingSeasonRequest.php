<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Seasons;

use App\Http\Requests\Api\V1\StrictJsonRequest;
use App\Models\Crop;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;

abstract class GrowingSeasonRequest extends StrictJsonRequest
{
    private const FIELD_TO_COLUMN = [
        'spaceId' => 'growing_space_id',
        'name' => 'name',
        'startDate' => 'start_date',
        'endDate' => 'end_date',
        'notes' => 'notes',
        'featuredCropId' => 'featured_crop_id',
    ];

    /**
     * @return array<string, mixed>
     */
    final public function persistenceAttributes(): array
    {
        $validated = $this->validated();
        $attributes = [];

        foreach (self::FIELD_TO_COLUMN as $field => $column) {
            if (array_key_exists($field, $validated)) {
                $attributes[$column] = $validated[$field];
            }
        }

        return $attributes;
    }

    final public function spaceId(): ?string
    {
        return $this->has('spaceId') ? $this->string('spaceId')->toString() : null;
    }

    /**
     * @return array<string, mixed>
     */
    final protected function fieldRules(bool $required): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'spaceId' => [$presence, 'string', 'uuid'],
            'name' => [$presence, 'string', 'min:2', 'max:30'],
            'startDate' => [$presence, 'string', 'date_format:Y-m-d'],
            'endDate' => [$presence, 'string', 'date_format:Y-m-d'],
            'notes' => [$required ? 'present' : 'sometimes', 'string', 'max:1000'],
            'featuredCropId' => ['sometimes', 'nullable', 'string', 'max:100', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'exists:crops,id'],
        ];
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['startDate', 'endDate'])) {
                    return;
                }

                $season = $this->route('growingSeason');
                $existingSeason = $season instanceof GrowingSeason ? $season : null;
                $startDate = $this->input('startDate', $existingSeason?->start_date?->toDateString());
                $endDate = $this->input('endDate', $existingSeason?->end_date?->toDateString());

                if (! is_string($startDate) || ! is_string($endDate)) {
                    return;
                }

                $start = CarbonImmutable::createFromFormat('!Y-m-d', $startDate);
                $end = CarbonImmutable::createFromFormat('!Y-m-d', $endDate);

                if ($end->isBefore($start)) {
                    $validator->errors()->add('endDate', '종료일은 시작일보다 빠를 수 없습니다.');

                    return;
                }

                if ($start->diffInDays($end) > 730) {
                    $validator->errors()->add('endDate', '재배 기간은 730일을 넘을 수 없습니다.');
                }
            },
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['spaceId', 'featuredCropId'])) {
                    return;
                }

                $season = $this->route('growingSeason');
                $existingSeason = $season instanceof GrowingSeason ? $season : null;
                $spaceId = $this->input('spaceId', $existingSeason?->growing_space_id);
                $cropId = $this->input('featuredCropId', $existingSeason?->featured_crop_id);
                if (! is_string($spaceId) || ! is_string($cropId) || $cropId === '') {
                    return;
                }

                $space = GrowingSpace::query()->find($spaceId);
                $crop = Crop::query()->find($cropId);
                if ($space !== null
                    && $crop !== null
                    && ! in_array($space->type->value, $crop->supported_spaces, true)) {
                    $validator->errors()->add('featuredCropId', '선택한 재배 공간에서 키울 수 없는 작물입니다.');
                }
            },
        ];
    }

    final protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['name', 'featuredCropId'] as $field) {
            if ($this->exists($field) && $this->input($field) !== null) {
                $normalized[$field] = trim((string) $this->input($field));
            }
        }

        if ($this->exists('notes')) {
            $normalized['notes'] = trim((string) $this->input('notes'));
        }

        $this->merge($normalized);
    }

    final protected function allowedFields(): array
    {
        return array_keys(self::FIELD_TO_COLUMN);
    }
}
