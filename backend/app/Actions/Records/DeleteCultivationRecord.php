<?php

declare(strict_types=1);

namespace App\Actions\Records;

use App\Models\CultivationRecord;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class DeleteCultivationRecord
{
    public function execute(CultivationRecord $record, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        DB::transaction(function () use ($record, $expectedVersion): void {
            $lockedRecord = CultivationRecord::query()->lockForUpdate()->findOrFail($record->id);
            if ($lockedRecord->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            $lockedRecord->delete();
        });
    }
}
