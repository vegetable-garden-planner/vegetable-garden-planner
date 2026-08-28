<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Spaces;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PaginationRequest;
use App\Http\Resources\Api\V1\GrowingSpaceResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\GrowingSpace;
use App\Support\Auth\AuthenticatedUser;
use Illuminate\Http\JsonResponse;

class IndexSpaceController extends Controller
{
    public function __invoke(PaginationRequest $request): JsonResponse
    {
        $user = AuthenticatedUser::from($request);
        $paginator = $user->growingSpaces()
            ->latest('created_at')
            ->paginate($request->perPage());

        $data = array_map(
            static fn (GrowingSpace $space): array => GrowingSpaceResource::make($space)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
