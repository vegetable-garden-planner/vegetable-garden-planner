<?php

declare(strict_types=1);

namespace App\Actions\Tasks;

use App\Models\CultivationTask;
use App\Models\GrowingSeason;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class DeleteSeasonCultivationTasks
{
    /** @param list<array{id: string, version: int}> $taskVersions */
    public function execute(GrowingSeason $season, array $taskVersions): void
    {
        DB::transaction(function () use ($season, $taskVersions): void {
            GrowingSeason::query()->lockForUpdate()->findOrFail($season->id);
            $tasks = CultivationTask::query()
                ->where('growing_season_id', $season->id)
                ->lockForUpdate()
                ->get();
            $expectedVersions = collect($taskVersions)->keyBy('id');

            $hasVersionMismatch = $tasks->contains(function (CultivationTask $task) use ($expectedVersions): bool {
                $expectedTask = $expectedVersions->get($task->id);

                return ! is_array($expectedTask) || $expectedTask['version'] !== $task->version;
            });

            if ($tasks->count() !== $expectedVersions->count() || $hasVersionMismatch) {
                EntityTag::versionConflict();
            }

            CultivationTask::query()->where('growing_season_id', $season->id)->delete();
        });
    }
}
