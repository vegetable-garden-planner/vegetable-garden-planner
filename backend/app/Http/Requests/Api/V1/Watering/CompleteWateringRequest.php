<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Watering;

use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;

class CompleteWateringRequest extends WateringScheduleRequest
{
    public function authorize(): bool
    {
        $season = $this->scheduleSeason();

        return $season !== null && $this->user()?->can('update', $season) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'wateredAt' => ['required', 'string', self::TIMESTAMP_RULE],
            'amountMl' => ['present', 'nullable', 'integer', 'min:1', 'max:100000'],
            'memo' => ['present', 'nullable', 'string', 'max:500'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if ($validator->errors()->has('wateredAt')) {
                    return;
                }

                $season = $this->scheduleSeason();
                if ($season === null) {
                    return;
                }

                $wateredOn = CarbonImmutable::parse($this->string('wateredAt')->toString())->toDateString();
                if ($wateredOn < $season->start_date->toDateString()
                    || $wateredOn > $season->end_date->toDateString()) {
                    $validator->errors()->add('wateredAt', '완료 시각은 재배 시즌 안이어야 합니다.');
                }
            },
        ];
    }

    /** @return array{watered_at: CarbonImmutable, amount_ml: ?int, memo: string} */
    public function persistenceAttributes(): array
    {
        $validated = $this->validated();

        return [
            'watered_at' => CarbonImmutable::parse((string) $validated['wateredAt'])->utc(),
            'amount_ml' => $validated['amountMl'] === null ? null : (int) $validated['amountMl'],
            'memo' => trim((string) ($validated['memo'] ?? '')),
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->exists('memo') && is_string($this->input('memo'))) {
            $this->merge(['memo' => trim((string) $this->input('memo'))]);
        }
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['wateredAt', 'amountMl', 'memo'];
    }
}
