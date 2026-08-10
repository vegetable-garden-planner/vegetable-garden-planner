<?php

declare(strict_types=1);

namespace App\Actions\Seasons;

use App\Models\GrowingSeason;
use App\Support\Http\EntityTag;

final class DeleteGrowingSeason
{
    public function execute(GrowingSeason $season, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);
        $deleted = GrowingSeason::query()
            ->whereKey($season->id)
            ->where('version', $expectedVersion)
            ->delete();

        if ($deleted !== 1) {
            EntityTag::versionConflict();
        }
    }
}
