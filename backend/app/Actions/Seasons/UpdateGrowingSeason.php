<?php

declare(strict_types=1);

namespace App\Actions\Seasons;

use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class UpdateGrowingSeason
{
    public function __construct(private readonly EnsureSeasonPeriodAvailable $ensurePeriodAvailable) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(GrowingSeason $season, array $attributes, ?string $ifMatch): GrowingSeason
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);
        $targetSpaceId = (string) ($attributes['growing_space_id'] ?? $season->growing_space_id);

        return DB::transaction(function () use (
            $season,
            $attributes,
            $expectedVersion,
            $targetSpaceId,
        ): GrowingSeason {
            GrowingSpace::query()
                ->whereIn('id', array_values(array_unique([$season->growing_space_id, $targetSpaceId])))
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $lockedSeason = GrowingSeason::query()->lockForUpdate()->findOrFail($season->id);

            if ($lockedSeason->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            $startDate = (string) ($attributes['start_date'] ?? $lockedSeason->start_date->toDateString());
            $endDate = (string) ($attributes['end_date'] ?? $lockedSeason->end_date->toDateString());

            $this->ensurePeriodAvailable->execute(
                $targetSpaceId,
                $startDate,
                $endDate,
                $lockedSeason->id,
            );

            $lockedSeason->forceFill([
                ...$attributes,
                'version' => $expectedVersion + 1,
            ])->save();

            return $lockedSeason->refresh();
        });
    }
}
