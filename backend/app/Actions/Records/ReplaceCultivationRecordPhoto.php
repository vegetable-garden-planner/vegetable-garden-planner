<?php

declare(strict_types=1);

namespace App\Actions\Records;

use App\Exceptions\ApiConflictException;
use App\Models\CultivationRecord;
use App\Support\Http\EntityTag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

final class ReplaceCultivationRecordPhoto
{
    /** 사진을 새로 저장하거나($photo), 기존 사진을 지운다(null). */
    public function execute(
        CultivationRecord $record,
        ?UploadedFile $photo,
        ?string $ifMatch,
    ): CultivationRecord {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);
        $storedPath = $photo === null ? null : $this->store($photo);

        try {
            [$saved, $previousPath] = DB::transaction(
                function () use ($record, $storedPath, $expectedVersion): array {
                    $locked = CultivationRecord::query()->lockForUpdate()->findOrFail($record->id);
                    if ($locked->version !== $expectedVersion) {
                        EntityTag::versionConflict();
                    }

                    $previousPath = $locked->photo_path;
                    $locked->forceFill([
                        'photo_path' => $storedPath,
                        'version' => $expectedVersion + 1,
                    ])->save();

                    return [$locked->refresh(), $previousPath];
                },
            );
        } catch (Throwable $exception) {
            // 저장에 실패하면 방금 올린 파일이 남지 않게 지운다.
            if ($storedPath !== null) {
                Storage::disk('uploads')->delete($storedPath);
            }

            throw $exception;
        }

        if ($previousPath !== null && $previousPath !== $storedPath) {
            Storage::disk('uploads')->delete($previousPath);
        }

        return $saved;
    }

    private function store(UploadedFile $photo): string
    {
        // 저장 이름은 서버가 만든다. 원본 파일명은 쓰지 않는다.
        $path = $photo->store('records', 'uploads');
        if (! is_string($path)) {
            throw new ApiConflictException('PHOTO_STORE_FAILED', '사진을 저장하지 못했습니다.');
        }

        return $path;
    }
}
