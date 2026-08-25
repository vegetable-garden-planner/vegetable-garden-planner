<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\ContainerPlacements;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PaginationRequest;
use App\Http\Resources\Api\V1\ContainerPlacementResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\ContainerPlacement;
use App\Support\Auth\AuthenticatedUser;
use Illuminate\Http\JsonResponse;

class IndexContainerPlacementsController extends Controller
{
    public function __invoke(PaginationRequest $request): JsonResponse
    {
        $user = AuthenticatedUser::from($request);
        $paginator = ContainerPlacement::query()
            ->whereHas(
                'growingSeason.growingSpace',
                static fn ($query) => $query->where('owner_id', $user->id),
            )
            ->paginate($request->perPage());

        $data = array_map(
            static fn (ContainerPlacement $placement): array => ContainerPlacementResource::make($placement)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
