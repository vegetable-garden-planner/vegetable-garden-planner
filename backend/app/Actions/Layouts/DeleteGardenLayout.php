<?php

declare(strict_types=1);

namespace App\Actions\Layouts;

use App\Exceptions\ApiConflictException;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class DeleteGardenLayout
{
    public function execute(GrowingSeason $season, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        DB::transaction(function () use ($season, $expectedVersion): void {
            GrowingSeason::query()->lockForUpdate()->findOrFail($season->id);
            $layout = GardenLayout::query()->lockForUpdate()->findOrFail($season->id);

            if ($layout->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            if ($season->wateringSchedules()->exists()) {
                throw new ApiConflictException(
                    'LAYOUT_HAS_WATERING_SCHEDULES',
                    '물주기 일정을 먼저 삭제해야 텃밭 배치를 삭제할 수 있습니다.',
                );
            }

            $layout->delete();
        });
    }
}
