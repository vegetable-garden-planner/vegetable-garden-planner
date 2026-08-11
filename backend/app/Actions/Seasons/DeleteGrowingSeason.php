<?php

declare(strict_types=1);

namespace App\Actions\Seasons;

use App\Exceptions\ApiConflictException;
use App\Models\GrowingSeason;
use App\Support\Http\EntityTag;
use Illuminate\Database\ForeignKeyConstraintViolationException;
use Illuminate\Support\Facades\DB;

final class DeleteGrowingSeason
{
    public function execute(GrowingSeason $season, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        try {
            DB::transaction(function () use ($season, $expectedVersion): void {
                $lockedSeason = GrowingSeason::query()->lockForUpdate()->findOrFail($season->id);

                if ($lockedSeason->version !== $expectedVersion) {
                    EntityTag::versionConflict();
                }

                if ($lockedSeason->layout()->exists()) {
                    $this->seasonHasLayout();
                }

                if ($lockedSeason->tasks()->exists()) {
                    $this->seasonHasTasks();
                }

                if ($lockedSeason->records()->exists()) {
                    $this->seasonHasRecords();
                }

                $lockedSeason->delete();
            });
        } catch (ForeignKeyConstraintViolationException $exception) {
            $freshSeason = GrowingSeason::query()->findOrFail($season->id);
            if ($freshSeason->layout()->exists()) {
                $this->seasonHasLayout();
            }

            if ($freshSeason->tasks()->exists()) {
                $this->seasonHasTasks();
            }

            if ($freshSeason->records()->exists()) {
                $this->seasonHasRecords();
            }

            throw $exception;
        }
    }

    private function seasonHasLayout(): never
    {
        throw new ApiConflictException(
            'SEASON_HAS_LAYOUT',
            '저장된 작물 배치를 먼저 삭제해야 시즌을 삭제할 수 있습니다.',
        );
    }

    private function seasonHasTasks(): never
    {
        throw new ApiConflictException(
            'SEASON_HAS_TASKS',
            '재배 시즌의 일정을 먼저 삭제해야 시즌을 삭제할 수 있습니다.',
        );
    }

    private function seasonHasRecords(): never
    {
        throw new ApiConflictException(
            'SEASON_HAS_RECORDS',
            '재배 시즌의 기록을 먼저 삭제해야 시즌을 삭제할 수 있습니다.',
        );
    }
}
