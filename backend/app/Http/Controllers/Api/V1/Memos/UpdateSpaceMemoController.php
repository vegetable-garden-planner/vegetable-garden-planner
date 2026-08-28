<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Memos;

use App\Actions\Memos\UpdateSpaceMemo;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Memos\UpdateSpaceMemoRequest;
use App\Http\Resources\Api\V1\SpaceMemoResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\SpaceMemo;
use Illuminate\Http\JsonResponse;

class UpdateSpaceMemoController extends Controller
{
    public function __invoke(
        UpdateSpaceMemoRequest $request,
        SpaceMemo $spaceMemo,
        UpdateSpaceMemo $updateSpaceMemo,
    ): JsonResponse {
        $memo = $updateSpaceMemo->execute(
            $spaceMemo,
            $request->persistenceAttributes(),
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            SpaceMemoResource::make($memo),
            $memo->version,
        );
    }
}
