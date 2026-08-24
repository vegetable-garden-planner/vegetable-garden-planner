<?php

declare(strict_types=1);

namespace App\Actions\Memos;

use App\Models\SpaceMemo;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class DeleteSpaceMemo
{
    public function execute(SpaceMemo $memo, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        DB::transaction(function () use ($memo, $expectedVersion): void {
            $lockedMemo = SpaceMemo::query()->lockForUpdate()->findOrFail($memo->id);
            if ($lockedMemo->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            $lockedMemo->delete();
        });
    }
}
