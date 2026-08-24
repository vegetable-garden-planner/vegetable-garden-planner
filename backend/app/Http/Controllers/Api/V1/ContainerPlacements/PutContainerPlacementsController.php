<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\ContainerPlacements;

use App\Actions\ContainerPlacements\ReplaceContainerPlacements;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ContainerPlacements\PutContainerPlacementsRequest;
use App\Http\Resources\Api\V1\ContainerPlacementsResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class PutContainerPlacementsController extends Controller
{
    public function __invoke(
        PutContainerPlacementsRequest $request,
        GrowingSeason $growingSeason,
        ReplaceContainerPlacements $replaceContainerPlacements,
    ): JsonResponse {
        Gate::authorize('update', $growingSeason);

        $result = $replaceContainerPlacements->execute(
            $growingSeason,
            $request->placements(),
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            ContainerPlacementsResource::make($result),
            $result['season']->version,
        );
    }
}
