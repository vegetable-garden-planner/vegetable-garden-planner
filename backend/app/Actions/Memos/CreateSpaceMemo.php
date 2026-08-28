<?php

declare(strict_types=1);

namespace App\Actions\Memos;

use App\Models\GrowingSpace;
use App\Models\SpaceMemo;
use Illuminate\Support\Facades\DB;

final class CreateSpaceMemo
{
    /** @param array<string, mixed> $attributes */
    public function execute(GrowingSpace $space, array $attributes): SpaceMemo
    {
        return DB::transaction(function () use ($space, $attributes): SpaceMemo {
            $lockedSpace = GrowingSpace::query()->lockForUpdate()->findOrFail($space->id);

            return $lockedSpace->memos()->create([
                ...$attributes,
                'version' => 1,
            ]);
        });
    }
}
