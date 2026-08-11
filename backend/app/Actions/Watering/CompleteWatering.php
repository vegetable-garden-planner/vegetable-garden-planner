<?php

declare(strict_types=1);

namespace App\Actions\Watering;

use App\Exceptions\ApiConflictException;
use App\Models\User;
use App\Models\WateringLog;
use App\Models\WateringSchedule;
use App\Support\Http\EntityTag;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class CompleteWatering
{
    /**
     * @param  array{watered_at: CarbonImmutable, amount_ml: ?int, memo: string}  $attributes
     * @return array{schedule: WateringSchedule, log: WateringLog}
     */
    public function execute(
        WateringSchedule $schedule,
        User $user,
        array $attributes,
        ?string $ifMatch,
    ): array {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($schedule, $user, $attributes, $expectedVersion): array {
            $lockedSchedule = WateringSchedule::query()
                ->with('growingSeason')
                ->lockForUpdate()
                ->findOrFail($schedule->id);
            if ($lockedSchedule->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }
            if (! $lockedSchedule->enabled) {
                throw new ApiConflictException(
                    'WATERING_SCHEDULE_DISABLED',
                    '비활성화된 물주기 일정은 완료할 수 없습니다.',
                );
            }

            $wateredAt = $attributes['watered_at'];
            $log = $lockedSchedule->logs()->create([
                'user_id' => $user->id,
                'scheduled_for' => $lockedSchedule->next_watering_at,
                ...$attributes,
            ]);
            $nextWateringAt = $wateredAt->addDays($lockedSchedule->interval_days);
            $withinSeason = $nextWateringAt->toDateString()
                <= $lockedSchedule->growingSeason->end_date->toDateString();

            $lockedSchedule->forceFill([
                'next_watering_at' => $nextWateringAt,
                'enabled' => $withinSeason,
                'version' => $expectedVersion + 1,
            ])->save();

            return [
                'schedule' => $lockedSchedule->refresh(),
                'log' => $log->refresh(),
            ];
        });
    }
}
