<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PaginationRequest;
use App\Http\Resources\Api\V1\WateringLogResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\WateringLog;
use App\Models\WateringSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class IndexWateringLogController extends Controller
{
    public function __invoke(PaginationRequest $request, WateringSchedule $wateringSchedule): JsonResponse
    {
        Gate::authorize('view', $wateringSchedule->growingSeason);
        $paginator = $wateringSchedule->logs()
            ->latest('watered_at')
            ->latest('created_at')
            ->paginate($request->perPage());
        $data = array_map(
            static fn (WateringLog $log): array => WateringLogResource::make($log)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
