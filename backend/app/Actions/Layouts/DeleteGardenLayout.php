<?php

declare(strict_types=1);

namespace App\Actions\Layouts;

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

            $layout->delete();
        });
    }
}
