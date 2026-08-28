<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Layouts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PaginationRequest;
use App\Http\Resources\Api\V1\GardenLayoutResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\GardenLayout;
use App\Support\Auth\AuthenticatedUser;
use Illuminate\Http\JsonResponse;

class IndexGardenLayoutController extends Controller
{
    public function __invoke(PaginationRequest $request): JsonResponse
    {
        $user = AuthenticatedUser::from($request);
        $paginator = GardenLayout::query()
            ->with('placements')
            ->whereHas(
                'growingSeason.growingSpace',
                static fn ($query) => $query->where('owner_id', $user->id),
            )
            ->latest('updated_at')
            ->paginate($request->perPage());

        $data = array_map(
            static fn (GardenLayout $layout): array => GardenLayoutResource::make($layout)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
