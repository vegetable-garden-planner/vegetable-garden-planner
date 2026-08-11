<?php

declare(strict_types=1);

namespace App\Actions\Records;

use App\Models\CultivationRecord;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class UpdateCultivationRecord
{
    /** @param array<string, mixed> $attributes */
    public function execute(
        CultivationRecord $record,
        array $attributes,
        ?string $ifMatch,
    ): CultivationRecord {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($record, $attributes, $expectedVersion): CultivationRecord {
            $lockedRecord = CultivationRecord::query()->lockForUpdate()->findOrFail($record->id);
            if ($lockedRecord->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            $lockedRecord->forceFill([
                ...$attributes,
                'version' => $expectedVersion + 1,
            ])->save();

            return $lockedRecord->refresh();
        });
    }
}
