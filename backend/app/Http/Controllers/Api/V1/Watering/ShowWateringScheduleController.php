<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\WateringScheduleResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\WateringSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ShowWateringScheduleController extends Controller
{
    public function __invoke(WateringSchedule $wateringSchedule): JsonResponse
    {
        Gate::authorize('view', $wateringSchedule);

        return VersionedResourceResponse::make(
            WateringScheduleResource::make($wateringSchedule),
            $wateringSchedule->version,
        );
    }
}
