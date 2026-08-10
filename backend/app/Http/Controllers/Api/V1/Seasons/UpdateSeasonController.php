<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Seasons;

use App\Actions\Seasons\UpdateGrowingSeason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Seasons\UpdateSeasonRequest;
use App\Http\Resources\Api\V1\GrowingSeasonResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class UpdateSeasonController extends Controller
{
    public function __invoke(
        UpdateSeasonRequest $request,
        GrowingSeason $growingSeason,
        UpdateGrowingSeason $updateGrowingSeason,
    ): JsonResponse {
        Gate::authorize('update', $growingSeason);

        $targetSpaceId = $request->spaceId();

        if ($targetSpaceId !== null && $targetSpaceId !== $growingSeason->growing_space_id) {
            $targetSpace = GrowingSpace::query()->findOrFail($targetSpaceId);
            Gate::authorize('view', $targetSpace);
        }

        $season = $updateGrowingSeason->execute(
            $growingSeason,
            $request->persistenceAttributes(),
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            GrowingSeasonResource::make($season),
            $season->version,
        );
    }
}
