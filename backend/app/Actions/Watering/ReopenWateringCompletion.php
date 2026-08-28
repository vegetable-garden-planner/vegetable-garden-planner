<?php

declare(strict_types=1);

namespace App\Actions\Watering;

use App\Exceptions\ApiConflictException;
use App\Models\WateringLog;
use App\Models\WateringSchedule;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class ReopenWateringCompletion
{
    public function execute(
        WateringSchedule $schedule,
        WateringLog $log,
        ?string $ifMatch,
    ): WateringSchedule {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($schedule, $log, $expectedVersion): WateringSchedule {
            $lockedSchedule = WateringSchedule::query()->lockForUpdate()->findOrFail($schedule->id);
            if ($lockedSchedule->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            $lockedLog = WateringLog::query()->lockForUpdate()->findOrFail($log->id);
            if ($lockedLog->watering_schedule_id !== $lockedSchedule->id) {
                throw new ApiConflictException(
                    'WATERING_LOG_SCHEDULE_MISMATCH',
                    '해당 완료 기록은 이 일정에 속하지 않습니다.',
                );
            }

            $latestLogId = $lockedSchedule->logs()
                ->latest('watered_at')
                ->latest('created_at')
                ->value('id');
            if ($latestLogId !== $lockedLog->id) {
                throw new ApiConflictException(
                    'WATERING_LOG_NOT_LATEST',
                    '가장 최근의 물주기 완료 기록만 취소할 수 있습니다.',
                );
            }

            $lockedSchedule->forceFill([
                'next_watering_at' => $lockedLog->scheduled_for,
                'enabled' => true,
                'version' => $expectedVersion + 1,
            ])->save();
            $lockedLog->delete();

            return $lockedSchedule->refresh();
        });
    }
}
