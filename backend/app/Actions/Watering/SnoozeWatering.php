<?php

declare(strict_types=1);

namespace App\Actions\Watering;

use App\Exceptions\ApiConflictException;
use App\Models\WateringSchedule;
use App\Models\WateringSnooze;
use App\Support\Http\EntityTag;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class SnoozeWatering
{
    /** @return array{schedule: WateringSchedule, snooze: WateringSnooze} */
    public function execute(
        WateringSchedule $schedule,
        CarbonImmutable $snoozedUntil,
        ?string $ifMatch,
    ): array {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($schedule, $snoozedUntil, $expectedVersion): array {
            $lockedSchedule = WateringSchedule::query()->lockForUpdate()->findOrFail($schedule->id);
            if ($lockedSchedule->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }
            if (! $lockedSchedule->enabled) {
                throw new ApiConflictException(
                    'WATERING_SCHEDULE_DISABLED',
                    '비활성화된 물주기 일정은 미룰 수 없습니다.',
                );
            }
            if ($snoozedUntil->lessThanOrEqualTo($lockedSchedule->next_watering_at)) {
                throw new ApiConflictException(
                    'WATERING_SNOOZE_NOT_LATER',
                    '미룬 시각은 현재 예정 시각보다 늦어야 합니다.',
                );
            }

            $snooze = $lockedSchedule->snoozes()->create([
                'original_at' => $lockedSchedule->next_watering_at,
                'snoozed_until' => $snoozedUntil,
            ]);
            $lockedSchedule->forceFill([
                'next_watering_at' => $snoozedUntil,
                'version' => $expectedVersion + 1,
            ])->save();

            return [
                'schedule' => $lockedSchedule->refresh(),
                'snooze' => $snooze->refresh(),
            ];
        });
    }
}
