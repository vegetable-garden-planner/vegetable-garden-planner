<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Actions\Watering\ReopenWateringCompletion;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\WateringScheduleResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\WateringLog;
use App\Models\WateringSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ReopenWateringCompletionController extends Controller
{
    public function __invoke(
        Request $request,
        WateringSchedule $wateringSchedule,
        WateringLog $wateringLog,
        ReopenWateringCompletion $reopenCompletion,
    ): JsonResponse {
        Gate::authorize('update', $wateringSchedule->growingSeason);
        $schedule = $reopenCompletion->execute(
            $wateringSchedule,
            $wateringLog,
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            WateringScheduleResource::make($schedule),
            $schedule->version,
        );
    }
}
