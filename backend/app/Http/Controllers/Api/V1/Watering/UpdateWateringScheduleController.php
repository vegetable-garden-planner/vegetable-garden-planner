<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Actions\Watering\UpdateWateringSchedule;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Watering\UpdateWateringScheduleRequest;
use App\Http\Resources\Api\V1\WateringScheduleResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\WateringSchedule;
use Illuminate\Http\JsonResponse;

class UpdateWateringScheduleController extends Controller
{
    public function __invoke(
        UpdateWateringScheduleRequest $request,
        WateringSchedule $wateringSchedule,
        UpdateWateringSchedule $updateSchedule,
    ): JsonResponse {
        $schedule = $updateSchedule->execute(
            $wateringSchedule,
            $request->persistenceAttributes(),
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            WateringScheduleResource::make($schedule),
            $schedule->version,
        );
    }
}
