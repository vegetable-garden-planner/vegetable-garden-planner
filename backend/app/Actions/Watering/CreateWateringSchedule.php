<?php

declare(strict_types=1);

namespace App\Actions\Watering;

use App\Exceptions\ApiConflictException;
use App\Models\GrowingSeason;
use App\Models\WateringSchedule;
use Illuminate\Support\Facades\DB;

final class CreateWateringSchedule
{
    /** @param array{crop_id: string, interval_days: int, next_watering_at: mixed, enabled: bool} $attributes */
    public function execute(GrowingSeason $season, array $attributes): WateringSchedule
    {
        return DB::transaction(function () use ($season, $attributes): WateringSchedule {
            $lockedSeason = GrowingSeason::query()->lockForUpdate()->findOrFail($season->id);
            $cropId = $attributes['crop_id'];

            $cropIsPlaced = DB::table('garden_layout_placements')
                ->where('growing_season_id', $lockedSeason->id)
                ->where('crop_id', $cropId)
                ->exists()
                || DB::table('container_placements')
                    ->where('growing_season_id', $lockedSeason->id)
                    ->where('crop_id', $cropId)
                    ->exists();
            if (! $cropIsPlaced) {
                throw new ApiConflictException(
                    'WATERING_CROP_NOT_PLACED',
                    '해당 시즌에 배치된 작물만 물주기 일정을 만들 수 있습니다.',
                );
            }

            if ($lockedSeason->wateringSchedules()->where('crop_id', $cropId)->exists()) {
                throw new ApiConflictException(
                    'WATERING_SCHEDULE_ALREADY_EXISTS',
                    '해당 작물의 물주기 일정이 이미 존재합니다.',
                );
            }

            return $lockedSeason->wateringSchedules()->create([
                ...$attributes,
                'version' => 1,
            ]);
        });
    }
}
