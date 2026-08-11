<?php

declare(strict_types=1);

namespace App\Actions\Watering;

use App\Exceptions\ApiConflictException;
use App\Models\WateringSchedule;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class DeleteWateringSchedule
{
    public function execute(WateringSchedule $schedule, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        DB::transaction(function () use ($schedule, $expectedVersion): void {
            $lockedSchedule = WateringSchedule::query()->lockForUpdate()->findOrFail($schedule->id);
            if ($lockedSchedule->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            if ($lockedSchedule->logs()->exists() || $lockedSchedule->snoozes()->exists()) {
                throw new ApiConflictException(
                    'WATERING_SCHEDULE_HAS_HISTORY',
                    '완료 또는 미루기 기록이 있는 일정은 삭제할 수 없습니다.',
                );
            }

            $lockedSchedule->delete();
        });
    }
}
