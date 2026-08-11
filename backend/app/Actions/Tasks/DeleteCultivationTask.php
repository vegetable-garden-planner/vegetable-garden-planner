<?php

declare(strict_types=1);

namespace App\Actions\Tasks;

use App\Models\CultivationTask;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class DeleteCultivationTask
{
    public function execute(CultivationTask $task, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        DB::transaction(function () use ($task, $expectedVersion): void {
            $lockedTask = CultivationTask::query()->lockForUpdate()->findOrFail($task->id);
            if ($lockedTask->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }
            $lockedTask->delete();
        });
    }
}
