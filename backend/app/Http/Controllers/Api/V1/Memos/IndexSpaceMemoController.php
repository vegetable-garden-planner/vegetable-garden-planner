<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Memos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PaginationRequest;
use App\Http\Resources\Api\V1\SpaceMemoResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\GrowingSpace;
use App\Models\SpaceMemo;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class IndexSpaceMemoController extends Controller
{
    public function __invoke(PaginationRequest $request, GrowingSpace $growingSpace): JsonResponse
    {
        Gate::authorize('view', $growingSpace);

        $paginator = $growingSpace->memos()
            ->latest('created_at')
            ->paginate($request->perPage());
        $data = array_map(
            static fn (SpaceMemo $memo): array => SpaceMemoResource::make($memo)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
