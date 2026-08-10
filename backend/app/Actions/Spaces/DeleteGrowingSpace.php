<?php

declare(strict_types=1);

namespace App\Actions\Spaces;

use App\Exceptions\ApiConflictException;
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

                if ($lockedSpace->seasons()->exists()) {
                    $this->spaceHasSeasons();
                }

                $lockedSpace->delete();
            });
        } catch (ForeignKeyConstraintViolationException) {
            $this->spaceHasSeasons();
        }
    }

    private function spaceHasSeasons(): never
    {
        throw new ApiConflictException(
            'SPACE_HAS_SEASONS',
            '연결된 재배 시즌이 있어 공간을 삭제할 수 없습니다.',
        );
    }
}
