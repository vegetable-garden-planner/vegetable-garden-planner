<?php

declare(strict_types=1);

namespace App\Actions\Spaces;

use App\Exceptions\ApiConflictException;
use App\Models\ContainerPlacement;
use App\Models\GrowingSpace;
use App\Support\Http\EntityTag;
use Illuminate\Database\ForeignKeyConstraintViolationException;
use Illuminate\Support\Facades\DB;

final class DeleteGrowingSpace
{
    public function execute(GrowingSpace $space, ?string $ifMatch): void
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        try {
            DB::transaction(function () use ($space, $expectedVersion): void {
                $lockedSpace = GrowingSpace::query()->lockForUpdate()->findOrFail($space->id);

                if ($lockedSpace->version !== $expectedVersion) {
                    EntityTag::versionConflict();
                }

                $this->assertDeletable($lockedSpace);

                $lockedSpace->delete();
            });
        } catch (ForeignKeyConstraintViolationException) {
            $this->assertDeletable(GrowingSpace::query()->findOrFail($space->id));
            throw new ApiConflictException(
                'SPACE_HAS_SEASONS',
                '연결된 재배 시즌이 있어 공간을 삭제할 수 없습니다.',
            );
        }
    }

    private function assertDeletable(GrowingSpace $space): void
    {
        if ($space->seasons()->exists()) {
            throw new ApiConflictException(
                'SPACE_HAS_SEASONS',
                '연결된 재배 시즌이 있어 공간을 삭제할 수 없습니다.',
            );
        }

        if ($space->memos()->exists()) {
            throw new ApiConflictException(
                'SPACE_HAS_MEMOS',
                '남긴 메모를 먼저 삭제해야 공간을 삭제할 수 있습니다.',
            );
        }

        if (ContainerPlacement::query()->where('growing_space_id', $space->id)->exists()) {
            throw new ApiConflictException(
                'SPACE_HAS_CONTAINER_PLACEMENTS',
                '이 화분에 배치된 작물을 먼저 정리해야 공간을 삭제할 수 있습니다.',
            );
        }
    }
}
