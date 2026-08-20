<?php

declare(strict_types=1);

namespace App\Actions\Records;

use App\Models\CultivationRecord;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class DeleteCultivationRecord
{
    public function execute(CultivationRecord $record, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        $photoPath = DB::transaction(function () use ($record, $expectedVersion): ?string {
            $lockedRecord = CultivationRecord::query()->lockForUpdate()->findOrFail($record->id);
            if ($lockedRecord->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            $lockedRecord->delete();

            return $lockedRecord->photo_path;
        });

        if ($photoPath !== null) {
            Storage::disk('uploads')->delete($photoPath);
        }
    }
}
