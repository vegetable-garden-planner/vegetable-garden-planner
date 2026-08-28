<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Spaces;

use App\Actions\Spaces\UpdateGrowingSpace;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Spaces\UpdateSpaceRequest;
use App\Http\Resources\Api\V1\GrowingSpaceResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSpace;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class UpdateSpaceController extends Controller
{
    public function __invoke(
        UpdateSpaceRequest $request,
        GrowingSpace $growingSpace,
        UpdateGrowingSpace $updateGrowingSpace,
    ): JsonResponse {
        Gate::authorize('update', $growingSpace);

        $space = $updateGrowingSpace->execute(
            $growingSpace,
            $request->persistenceAttributes(),
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            GrowingSpaceResource::make($space),
            $space->version,
        );
    }
}
