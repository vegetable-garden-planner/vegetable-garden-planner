<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Watering;

use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;

class UpdateWateringScheduleRequest extends WateringScheduleRequest
{
    private const FIELD_TO_COLUMN = [
        'intervalDays' => 'interval_days',
        'nextWateringAt' => 'next_watering_at',
        'enabled' => 'enabled',
    ];

    public function authorize(): bool
    {
        $season = $this->scheduleSeason();

        return $season !== null && $this->user()?->can('update', $season) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->scheduleRules('sometimes');
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if ($this->validatedFields() === []) {
                    $validator->errors()->add('schedule', '변경할 필드를 하나 이상 입력해야 합니다.');
                }
            },
        ];
    }

    /** @return array<string, mixed> */
    public function persistenceAttributes(): array
    {
        $attributes = [];
        foreach ($this->validatedFields() as $field => $value) {
            $attributes[self::FIELD_TO_COLUMN[$field]] = match ($field) {
                'intervalDays' => (int) $value,
                'nextWateringAt' => CarbonImmutable::parse((string) $value)->utc(),
                'enabled' => (bool) $value,
            };
        }

        return $attributes;
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return array_keys(self::FIELD_TO_COLUMN);
    }

    /** @return array<string, mixed> */
    private function validatedFields(): array
    {
        return array_intersect_key($this->validated(), self::FIELD_TO_COLUMN);
    }
}
