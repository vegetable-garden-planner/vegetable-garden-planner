<?php

declare(strict_types=1);

namespace App\Actions\Tasks;

use App\Domain\Tasks\BuildCultivationTaskDrafts;
use App\Enums\GrowingSpaceType;
use App\Exceptions\ApiConflictException;
use App\Models\Crop;
use App\Models\CultivationTask;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Support\Http\EntityTag;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

final class GenerateCultivationTasks
{
    public function __construct(private readonly BuildCultivationTaskDrafts $buildDrafts) {}

    /** @return Collection<int, CultivationTask> */
    public function execute(GrowingSeason $season, ?string $ifMatch): Collection
    {
        $expectedSourceVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($season, $expectedSourceVersion): Collection {
            $lockedSeason = GrowingSeason::query()
                ->with('growingSpace')
                ->lockForUpdate()
                ->findOrFail($season->id);
            $cropIds = $lockedSeason->growingSpace->type === GrowingSpaceType::Garden
                ? $this->gardenCropIds($lockedSeason, $expectedSourceVersion)
                : $this->containerCropIds($lockedSeason, $expectedSourceVersion);

            $crops = Crop::query()->whereIn('id', $cropIds)->orderBy('id')->get();
            if ($crops->count() !== $cropIds->count()) {
                throw new ApiConflictException(
                    'LAYOUT_CROP_NOT_FOUND',
                    '배치된 작물 기준 정보를 찾을 수 없습니다.',
                );
            }

            $drafts = $this->buildDrafts->execute($lockedSeason, $crops);
            $lockedSeason->tasks()->delete();
            $lockedSeason->tasks()->createMany($drafts);

            return $lockedSeason->tasks()
                ->orderBy('due_date')
                ->orderBy('title')
                ->get();
        });
    }

    /** @return \Illuminate\Support\Collection<int, string> */
    private function gardenCropIds(GrowingSeason $season, int $expectedVersion): \Illuminate\Support\Collection
    {
        $layout = GardenLayout::query()->lockForUpdate()->find($season->id);
        if ($layout === null) {
            throw new ApiConflictException(
                'SEASON_LAYOUT_REQUIRED',
                '먼저 텃밭 격자를 만들고 작물을 배치해 주세요.',
            );
        }
        if ($layout->version !== $expectedVersion) {
            EntityTag::versionConflict();
        }

        $cropIds = $layout->placements()->lockForUpdate()->pluck('crop_id')->unique()->values();
        if ($cropIds->isEmpty()) {
            throw new ApiConflictException(
                'LAYOUT_HAS_NO_CROPS',
                '격자에 키울 작물을 한 칸 이상 배치해 주세요.',
            );
        }

        return $cropIds;
    }

    /** @return \Illuminate\Support\Collection<int, string> */
    private function containerCropIds(GrowingSeason $season, int $expectedVersion): \Illuminate\Support\Collection
    {
        if ($season->version !== $expectedVersion) {
            EntityTag::versionConflict();
        }
        if ($season->featured_crop_id === null) {
            throw new ApiConflictException(
                'FEATURED_CROP_REQUIRED',
                '화분·베란다 시즌에서 키울 작물을 먼저 선택해 주세요.',
            );
        }

        return collect([$season->featured_crop_id]);
    }
}
