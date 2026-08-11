<?php

declare(strict_types=1);

namespace App\Actions\Tasks;

use App\Domain\Tasks\BuildCultivationTaskDrafts;
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
        $expectedLayoutVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($season, $expectedLayoutVersion): Collection {
            $lockedSeason = GrowingSeason::query()->lockForUpdate()->findOrFail($season->id);
            $layout = GardenLayout::query()->lockForUpdate()->find($lockedSeason->id);

            if ($layout === null) {
                throw new ApiConflictException(
                    'SEASON_LAYOUT_REQUIRED',
                    '먼저 텃밭 격자를 만들고 작물을 배치해 주세요.',
                );
            }
            if ($layout->version !== $expectedLayoutVersion) {
                EntityTag::versionConflict();
            }

            $placements = $layout->placements()->lockForUpdate()->get();
            $cropIds = $placements->pluck('crop_id')->unique()->values();
            if ($cropIds->isEmpty()) {
                throw new ApiConflictException(
                    'LAYOUT_HAS_NO_CROPS',
                    '격자에 키울 작물을 한 칸 이상 배치해 주세요.',
                );
            }

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
}
