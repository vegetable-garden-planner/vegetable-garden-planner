<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\ContainerPlacements;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\ContainerPlacementsResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ShowContainerPlacementsController extends Controller
{
    public function __invoke(GrowingSeason $growingSeason): JsonResponse
    {
        Gate::authorize('view', $growingSeason);

        $placements = $growingSeason->containerPlacements()->orderBy('id')->get();

        return VersionedResourceResponse::make(
            ContainerPlacementsResource::make(['season' => $growingSeason, 'placements' => $placements]),
            $growingSeason->version,
        );
    }
}
