<?php

declare(strict_types=1);

namespace App\Http\Responses;

use App\Support\Http\EntityTag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

final class VersionedResourceResponse
{
    public static function make(JsonResource $resource, int $version, int $status = 200): JsonResponse
    {
        return response()
            ->json(['data' => $resource->resolve()], $status)
            ->header('ETag', EntityTag::forVersion($version));
    }
}
