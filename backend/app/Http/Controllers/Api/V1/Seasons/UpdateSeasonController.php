<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Seasons;

use App\Actions\Seasons\UpdateGrowingSeason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Seasons\UpdateSeasonRequest;
use App\Http\Resources\Api\V1\GrowingSeasonResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;

class UpdateSeasonController extends Controller
{
    public function __invoke(
        UpdateSeasonRequest $request,
        GrowingSeason $growingSeason,
        UpdateGrowingSeason $updateGrowingSeason,
    ): JsonResponse {
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
