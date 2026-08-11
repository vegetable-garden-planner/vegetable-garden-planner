<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Actions\Watering\SnoozeWatering;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Watering\SnoozeWateringRequest;
use App\Http\Resources\Api\V1\WateringScheduleResource;
use App\Http\Resources\Api\V1\WateringSnoozeResource;
use App\Models\WateringSchedule;
use App\Support\Http\EntityTag;
use Illuminate\Http\JsonResponse;

class SnoozeWateringController extends Controller
{
    public function __invoke(
        SnoozeWateringRequest $request,
        WateringSchedule $wateringSchedule,
        SnoozeWatering $snoozeWatering,
    ): JsonResponse {
        $result = $snoozeWatering->execute(
            $wateringSchedule,
            $request->snoozedUntil(),
            $request->header('If-Match'),
        );

        return response()->json([
            'data' => [
                'schedule' => WateringScheduleResource::make($result['schedule'])->resolve(),
                'snooze' => WateringSnoozeResource::make($result['snooze'])->resolve(),
            ],
        ], 201)->header('ETag', EntityTag::forVersion($result['schedule']->version));
    }
}
