<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Watering;

use App\Models\WateringSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;

class SnoozeWateringRequest extends WateringScheduleRequest
{
    public function authorize(): bool
    {
        $schedule = $this->route('wateringSchedule');

        return $schedule instanceof WateringSchedule && $this->user()?->can('update', $schedule) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['snoozedUntil' => ['required', 'string', self::TIMESTAMP_RULE]];
    }

    public function snoozedUntil(): CarbonImmutable
    {
        return CarbonImmutable::parse((string) $this->validated('snoozedUntil'))->utc();
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if ($validator->errors()->has('snoozedUntil')) {
                    return;
                }

                $season = $this->scheduleSeason();
                if ($season === null) {
                    return;
                }

                $snoozedOn = CarbonImmutable::parse($this->string('snoozedUntil')->toString())->toDateString();
                if ($snoozedOn < $season->start_date->toDateString()
                    || $snoozedOn > $season->end_date->toDateString()) {
                    $validator->errors()->add('snoozedUntil', '미룬 시각은 재배 시즌 안이어야 합니다.');
                }
            },
        ];
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['snoozedUntil'];
    }
}
