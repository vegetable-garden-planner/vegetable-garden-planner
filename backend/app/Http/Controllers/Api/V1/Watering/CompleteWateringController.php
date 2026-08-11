<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Actions\Watering\CompleteWatering;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Watering\CompleteWateringRequest;
use App\Http\Resources\Api\V1\WateringLogResource;
use App\Http\Resources\Api\V1\WateringScheduleResource;
use App\Models\WateringSchedule;
use App\Support\Auth\AuthenticatedUser;
use App\Support\Http\EntityTag;
use Illuminate\Http\JsonResponse;

class CompleteWateringController extends Controller
{
    public function __invoke(
        CompleteWateringRequest $request,
        WateringSchedule $wateringSchedule,
        CompleteWatering $completeWatering,
    ): JsonResponse {
        $result = $completeWatering->execute(
            $wateringSchedule,
            AuthenticatedUser::from($request),
            $request->persistenceAttributes(),
            $request->header('If-Match'),
        );

        return response()->json([
            'data' => [
                'schedule' => WateringScheduleResource::make($result['schedule'])->resolve(),
                'log' => WateringLogResource::make($result['log'])->resolve(),
            ],
        ], 201)->header('ETag', EntityTag::forVersion($result['schedule']->version));
    }
}
