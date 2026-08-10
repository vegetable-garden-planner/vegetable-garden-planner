<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Spaces;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Spaces\StoreSpaceRequest;
use App\Http\Resources\Api\V1\GrowingSpaceResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Support\Auth\AuthenticatedUser;
use Illuminate\Http\JsonResponse;

class StoreSpaceController extends Controller
{
    public function __invoke(StoreSpaceRequest $request): JsonResponse
    {
        $user = AuthenticatedUser::from($request);
        $space = $user->growingSpaces()->create($request->persistenceAttributes());
        $space->refresh();

        return VersionedResourceResponse::make(
            GrowingSpaceResource::make($space),
            $space->version,
            201,
        );
    }
}
