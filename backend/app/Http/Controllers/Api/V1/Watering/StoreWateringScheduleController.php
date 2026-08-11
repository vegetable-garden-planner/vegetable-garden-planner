<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Actions\Watering\CreateWateringSchedule;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Watering\StoreWateringScheduleRequest;
use App\Http\Resources\Api\V1\WateringScheduleResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;

class StoreWateringScheduleController extends Controller
{
    public function __invoke(
        StoreWateringScheduleRequest $request,
        GrowingSeason $growingSeason,
        CreateWateringSchedule $createSchedule,
    ): JsonResponse {
        $schedule = $createSchedule->execute($growingSeason, $request->persistenceAttributes());

        return VersionedResourceResponse::make(
            WateringScheduleResource::make($schedule),
            $schedule->version,
            201,
        );
    }
}
