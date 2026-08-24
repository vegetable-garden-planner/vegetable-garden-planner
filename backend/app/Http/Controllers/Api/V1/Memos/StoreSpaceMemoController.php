<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Memos;

use App\Actions\Memos\CreateSpaceMemo;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Memos\StoreSpaceMemoRequest;
use App\Http\Resources\Api\V1\SpaceMemoResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSpace;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class StoreSpaceMemoController extends Controller
{
    public function __invoke(
        StoreSpaceMemoRequest $request,
        GrowingSpace $growingSpace,
        CreateSpaceMemo $createSpaceMemo,
    ): JsonResponse {
        Gate::authorize('update', $growingSpace);
        $memo = $createSpaceMemo->execute($growingSpace, $request->persistenceAttributes());

        return VersionedResourceResponse::make(
            SpaceMemoResource::make($memo),
            $memo->version,
            201,
        );
    }
}
