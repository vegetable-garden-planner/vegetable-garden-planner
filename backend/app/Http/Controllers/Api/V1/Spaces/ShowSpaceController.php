<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Spaces;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\GrowingSpaceResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSpace;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ShowSpaceController extends Controller
{
    public function __invoke(GrowingSpace $growingSpace): JsonResponse
    {
        Gate::authorize('view', $growingSpace);

        return VersionedResourceResponse::make(
            GrowingSpaceResource::make($growingSpace),
            $growingSpace->version,
        );
    }
}
