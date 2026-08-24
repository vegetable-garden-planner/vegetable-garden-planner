<?php

declare(strict_types=1);

namespace App\Actions\ContainerPlacements;

use App\Enums\GrowingSpaceType;
use App\Exceptions\ApiConflictException;
use App\Models\ContainerPlacement;
use App\Models\GrowingSeason;
use App\Support\Http\EntityTag;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

final class ReplaceContainerPlacements
{
    /**
     * @param  list<array{spaceId: string, cropId: string, quantity: int, position: mixed}>  $placements
     * @return array{season: GrowingSeason, placements: Collection<int, ContainerPlacement>}
     */
    public function execute(GrowingSeason $season, array $placements, ?string $ifMatch): array
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($season, $placements, $expectedVersion): array {
            $lockedSeason = GrowingSeason::query()
                ->with('growingSpace')
                ->lockForUpdate()
                ->findOrFail($season->id);

            if ($lockedSeason->growingSpace->type === GrowingSpaceType::Garden) {
                throw new ApiConflictException(
                    'CONTAINER_PLACEMENT_REQUIRES_CONTAINER_SEASON',
                    '화분 배치는 화분·베란다 유형의 시즌에서만 사용할 수 있습니다.',
                );
            }

            if ($lockedSeason->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            $scheduledCropIds = $lockedSeason->wateringSchedules()->pluck('crop_id')->all();
            $replacementCropIds = array_column($placements, 'cropId');
            if (array_diff($scheduledCropIds, $replacementCropIds) !== []) {
                throw new ApiConflictException(
                    'CONTAINER_PLACEMENT_CROP_HAS_WATERING_SCHEDULE',
                    '물주기 일정이 있는 작물은 배치에서 제거할 수 없습니다.',
                );
            }

            $lockedSeason->containerPlacements()->delete();
            $lockedSeason->containerPlacements()->createMany(array_map(
                static fn (array $placement): array => [
                    'growing_space_id' => $placement['spaceId'],
                    'crop_id' => $placement['cropId'],
                    'quantity' => $placement['quantity'],
                    'position' => $placement['position'] ?? null,
                ],
                $placements,
            ));

            $lockedSeason->version++;
            $lockedSeason->save();

            return [
                'season' => $lockedSeason->refresh(),
                'placements' => $lockedSeason->containerPlacements()->orderBy('id')->get(),
            ];
        });
    }
}
