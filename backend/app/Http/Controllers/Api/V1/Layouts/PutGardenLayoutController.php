<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Layouts;

use App\Actions\Layouts\UpsertGardenLayout;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Layouts\PutGardenLayoutRequest;
use App\Http\Resources\Api\V1\GardenLayoutResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class PutGardenLayoutController extends Controller
{
    public function __invoke(
        PutGardenLayoutRequest $request,
        GrowingSeason $growingSeason,
        UpsertGardenLayout $upsertGardenLayout,
    ): JsonResponse {
        Gate::authorize('update', $growingSeason);
        $result = $upsertGardenLayout->execute(
            $growingSeason,
            $request->layoutAttributes(),
            $request->placements(),
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            GardenLayoutResource::make($result['layout']),
            $result['layout']->version,
            $result['created'] ? 201 : 200,
        );
    }
}
