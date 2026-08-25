<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Seasons;

use App\Actions\Seasons\CreateGrowingSeason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Seasons\StoreSeasonRequest;
use App\Http\Resources\Api\V1\GrowingSeasonResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSpace;
use Illuminate\Http\JsonResponse;
use LogicException;

class StoreSeasonController extends Controller
{
    public function __invoke(
        StoreSeasonRequest $request,
        CreateGrowingSeason $createGrowingSeason,
    ): JsonResponse {
        $spaceId = $request->spaceId();

        if ($spaceId === null) {
            throw new LogicException('검증된 공간 ID가 없습니다.');
        }

        $space = GrowingSpace::query()->findOrFail($spaceId);
        $season = $createGrowingSeason->execute($space, $request->persistenceAttributes());

        return VersionedResourceResponse::make(
            GrowingSeasonResource::make($season),
            $season->version,
            201,
        );
    }
}
