<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Layouts;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\GardenLayoutResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ShowGardenLayoutController extends Controller
{
    public function __invoke(GrowingSeason $growingSeason): JsonResponse
    {
        Gate::authorize('view', $growingSeason);
        $layout = GardenLayout::query()
            ->with('placements')
            ->findOrFail($growingSeason->id);

        return VersionedResourceResponse::make(
            GardenLayoutResource::make($layout),
            $layout->version,
        );
    }
}
