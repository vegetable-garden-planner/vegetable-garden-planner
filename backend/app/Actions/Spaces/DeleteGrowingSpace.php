<?php

declare(strict_types=1);

namespace App\Actions\Spaces;

use App\Models\GrowingSpace;
use App\Support\Http\EntityTag;

final class DeleteGrowingSpace
{
    public function execute(GrowingSpace $space, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        $deleted = GrowingSpace::query()
            ->whereKey($space->id)
            ->where('version', $expectedVersion)
            ->delete();

        if ($deleted !== 1) {
            EntityTag::versionConflict();
        }
    }
}
