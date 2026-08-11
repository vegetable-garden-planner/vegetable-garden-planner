<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Seasons;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\GrowingSeasonResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ShowSeasonController extends Controller
{
    public function __invoke(GrowingSeason $growingSeason): JsonResponse
    {
        Gate::authorize('view', $growingSeason);

        return VersionedResourceResponse::make(
            GrowingSeasonResource::make($growingSeason),
            $growingSeason->version,
        );
    }
}
