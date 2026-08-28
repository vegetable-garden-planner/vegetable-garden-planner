<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Watering;

use Carbon\CarbonImmutable;

class StoreWateringScheduleRequest extends WateringScheduleRequest
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
            'cropId' => ['required', 'string', 'max:100', 'exists:crops,id'],
            ...$this->scheduleRules('required'),
        ];
    }

    /** @return array{crop_id: string, interval_days: int, next_watering_at: CarbonImmutable, enabled: bool} */
    public function persistenceAttributes(): array
    {
        $validated = $this->validated();

        return [
            'crop_id' => (string) $validated['cropId'],
            'interval_days' => (int) $validated['intervalDays'],
            'next_watering_at' => CarbonImmutable::parse((string) $validated['nextWateringAt'])->utc(),
            'enabled' => (bool) $validated['enabled'],
        ];
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['cropId', 'intervalDays', 'nextWateringAt', 'enabled'];
    }
}
