<?php

declare(strict_types=1);

namespace App\Actions\Tasks;

use App\Enums\CultivationTaskStatus;
use App\Models\CultivationTask;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class UpdateCultivationTask
{
    /** @param array<string, mixed> $attributes */
    public function execute(CultivationTask $task, array $attributes, ?string $ifMatch): CultivationTask
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        return DB::transaction(function () use ($task, $attributes, $expectedVersion): CultivationTask {
            $lockedTask = CultivationTask::query()->lockForUpdate()->findOrFail($task->id);
            if ($lockedTask->version !== $expectedVersion) {
                EntityTag::versionConflict();
            }

            if (array_key_exists('status', $attributes)) {
                $targetStatus = CultivationTaskStatus::from((string) $attributes['status']);
                $attributes['completed_at'] = $targetStatus === CultivationTaskStatus::Completed
                    ? ($lockedTask->completed_at ?? now())
                    : null;
            }

            $lockedTask->forceFill([
                ...$attributes,
                'version' => $expectedVersion + 1,
            ])->save();

            return $lockedTask->refresh();
        });
    }
}
