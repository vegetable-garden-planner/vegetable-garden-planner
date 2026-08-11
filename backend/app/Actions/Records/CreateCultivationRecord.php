<?php

declare(strict_types=1);

namespace App\Actions\Records;

use App\Models\CultivationRecord;
use App\Models\GrowingSeason;
use Illuminate\Support\Facades\DB;

final class CreateCultivationRecord
{
    /** @param array<string, mixed> $attributes */
    public function execute(GrowingSeason $season, array $attributes): CultivationRecord
    {
        return DB::transaction(function () use ($season, $attributes): CultivationRecord {
            $lockedSeason = GrowingSeason::query()->lockForUpdate()->findOrFail($season->id);

            return $lockedSeason->records()->create([
                ...$attributes,
                'version' => 1,
            ]);
        });
    }
}
