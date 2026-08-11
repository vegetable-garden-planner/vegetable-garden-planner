<?php

declare(strict_types=1);

namespace App\Actions\Watering;

use App\Models\WateringSchedule;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class UpdateWateringSchedule
{
    /** @param array<string, mixed> $attributes */
    public function execute(WateringSchedule $schedule, array $attributes, ?string $ifMatch): WateringSchedule
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($schedule, $attributes, $expectedVersion): WateringSchedule {
            $lockedSchedule = WateringSchedule::query()->lockForUpdate()->findOrFail($schedule->id);
            if ($lockedSchedule->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            $lockedSchedule->forceFill([
                ...$attributes,
                'version' => $expectedVersion + 1,
            ])->save();

            return $lockedSchedule->refresh();
        });
    }
}
