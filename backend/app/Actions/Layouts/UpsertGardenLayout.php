<?php

declare(strict_types=1);

namespace App\Actions\Layouts;

use App\Enums\GrowingSpaceType;
use App\Exceptions\ApiConflictException;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class UpsertGardenLayout
{
    /**
     * @param  array{spaceWidthCm: int, spaceLengthCm: int, cellSizeCm: int}  $input
     * @param  list<array{cellIndex: int, cropId: string}>  $placements
     * @return array{layout: GardenLayout, created: bool}
     */
    public function execute(
        GrowingSeason $season,
        array $input,
        array $placements,
        ?string $ifMatch,
    ): array {
        return DB::transaction(function () use ($season, $input, $placements, $ifMatch): array {
            $lockedSeason = GrowingSeason::query()
                ->with('growingSpace')
                ->lockForUpdate()
                ->findOrFail($season->id);
            $space = $lockedSeason->growingSpace;

            if ($space->type !== GrowingSpaceType::Garden) {
                throw new ApiConflictException(
                    'LAYOUT_REQUIRES_GARDEN',
                    '텃밭 유형의 공간에만 격자를 만들 수 있습니다.',
                );
            }

            if ($input['spaceWidthCm'] !== $space->width_cm
                || $input['spaceLengthCm'] !== $space->length_cm) {
                throw new ApiConflictException(
                    'SPACE_DIMENSIONS_CHANGED',
                    '재배 공간 크기가 변경되었습니다. 최신 공간 정보로 격자를 다시 만들어 주세요.',
                );
            }

            $layout = GardenLayout::query()->lockForUpdate()->find($lockedSeason->id);
            $created = $layout === null;
            $version = 1;

            if ($layout !== null) {
                $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);
                if ($layout->version !== $expectedVersion) {
                    EntityTag::versionConflict();
                }
                $version = $expectedVersion + 1;
            }

            $columns = intdiv($space->width_cm, $input['cellSizeCm']);
            $rows = intdiv($space->length_cm, $input['cellSizeCm']);
            $values = [
                'growing_space_id' => $space->id,
                'space_width_cm' => $space->width_cm,
                'space_length_cm' => $space->length_cm,
                'cell_size_cm' => $input['cellSizeCm'],
                'columns' => $columns,
                'rows' => $rows,
                'version' => $version,
            ];

            if ($layout === null) {
                $layout = GardenLayout::query()->create([
                    'growing_season_id' => $lockedSeason->id,
                    ...$values,
                ]);
            } else {
                $layout->forceFill($values)->save();
                $layout->placements()->delete();
            }

            $layout->placements()->createMany(array_map(
                static fn (array $placement): array => [
                    'cell_index' => $placement['cellIndex'],
                    'crop_id' => $placement['cropId'],
                ],
                $placements,
            ));

            return ['layout' => $layout->refresh()->load('placements'), 'created' => $created];
        });
    }
}
