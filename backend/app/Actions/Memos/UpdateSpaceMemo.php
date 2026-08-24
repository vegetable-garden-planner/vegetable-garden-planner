<?php

declare(strict_types=1);

namespace App\Actions\Memos;

use App\Models\SpaceMemo;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class UpdateSpaceMemo
{
    /** @param array<string, mixed> $attributes */
    public function execute(SpaceMemo $memo, array $attributes, ?string $ifMatch): SpaceMemo
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($memo, $attributes, $expectedVersion): SpaceMemo {
            $lockedMemo = SpaceMemo::query()->lockForUpdate()->findOrFail($memo->id);
            if ($lockedMemo->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            $lockedMemo->forceFill([
                ...$attributes,
                'version' => $expectedVersion + 1,
            ])->save();

            return $lockedMemo->refresh();
        });
    }
}
