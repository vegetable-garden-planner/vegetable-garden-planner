<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Watering;

use App\Http\Requests\Api\V1\StrictJsonRequest;
use App\Models\GrowingSeason;
use App\Models\WateringSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;

abstract class WateringScheduleRequest extends StrictJsonRequest
{
    protected const TIMESTAMP_RULE = 'regex:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/';

    /** @return array<string, mixed> */
    protected function scheduleRules(string $presence): array
    {
        return [
            'intervalDays' => [$presence, 'integer', 'min:1', 'max:365'],
            'nextWateringAt' => [$presence, 'string', self::TIMESTAMP_RULE],
            'enabled' => [$presence, 'boolean'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if ($validator->errors()->has('nextWateringAt') || ! $this->has('nextWateringAt')) {
                    return;
                }

                $season = $this->scheduleSeason();
                if ($season === null) {
                    return;
                }

                $wateringOn = CarbonImmutable::parse($this->string('nextWateringAt')->toString())->toDateString();
                if ($wateringOn < $season->start_date->toDateString()
                    || $wateringOn > $season->end_date->toDateString()) {
                    $validator->errors()->add('nextWateringAt', '물주기 시각은 재배 시즌 안이어야 합니다.');
                }
            },
        ];
    }

    protected function scheduleSeason(): ?GrowingSeason
    {
        $season = $this->route('growingSeason');
        if ($season instanceof GrowingSeason) {
            return $season;
        }

        $schedule = $this->route('wateringSchedule');

        return $schedule instanceof WateringSchedule ? $schedule->growingSeason : null;
    }
}
