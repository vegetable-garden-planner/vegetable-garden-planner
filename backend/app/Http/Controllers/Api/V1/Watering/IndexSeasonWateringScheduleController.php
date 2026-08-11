<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PaginationRequest;
use App\Http\Resources\Api\V1\WateringScheduleResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\GrowingSeason;
use App\Models\WateringSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class IndexSeasonWateringScheduleController extends Controller
{
    public function __invoke(PaginationRequest $request, GrowingSeason $growingSeason): JsonResponse
    {
        Gate::authorize('view', $growingSeason);
        $paginator = $growingSeason->wateringSchedules()
            ->orderBy('next_watering_at')
            ->orderBy('created_at')
            ->paginate($request->perPage());
        $data = array_map(
            static fn (WateringSchedule $schedule): array => WateringScheduleResource::make($schedule)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
