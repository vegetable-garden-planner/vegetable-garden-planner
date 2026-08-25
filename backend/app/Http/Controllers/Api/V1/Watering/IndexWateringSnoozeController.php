<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PaginationRequest;
use App\Http\Resources\Api\V1\WateringSnoozeResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\WateringSchedule;
use App\Models\WateringSnooze;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class IndexWateringSnoozeController extends Controller
{
    public function __invoke(PaginationRequest $request, WateringSchedule $wateringSchedule): JsonResponse
    {
        Gate::authorize('view', $wateringSchedule);
        $paginator = $wateringSchedule->snoozes()->latest('created_at')->paginate($request->perPage());
        $data = array_map(
            static fn (WateringSnooze $snooze): array => WateringSnoozeResource::make($snooze)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
