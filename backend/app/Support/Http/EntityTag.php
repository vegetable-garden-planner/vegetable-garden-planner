<?php

declare(strict_types=1);

namespace App\Support\Http;

use App\Exceptions\ApiPreconditionException;

final class EntityTag
{
    public static function forVersion(int $version): string
    {
        return sprintf('"%d"', $version);
    }

    public static function versionFromIfMatch(?string $ifMatch): int
    {
        if ($ifMatch === null || preg_match('/^"([1-9][0-9]*)"$/', $ifMatch, $matches) !== 1) {
            throw new ApiPreconditionException(
                'PRECONDITION_REQUIRED',
                '유효한 If-Match 헤더가 필요합니다.',
            );
        }

        return (int) $matches[1];
    }

    public static function versionConflict(): never
    {
        throw new ApiPreconditionException(
            'VERSION_CONFLICT',
            '다른 곳에서 먼저 수정된 데이터입니다. 최신 정보를 다시 조회해 주세요.',
        );
    }
}
