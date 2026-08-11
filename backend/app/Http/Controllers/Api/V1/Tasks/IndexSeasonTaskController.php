<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Tasks\IndexTaskRequest;
use App\Http\Resources\Api\V1\CultivationTaskResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\CultivationTask;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class IndexSeasonTaskController extends Controller
{
    public function __invoke(IndexTaskRequest $request, GrowingSeason $growingSeason): JsonResponse
    {
        Gate::authorize('view', $growingSeason);
        $query = $growingSeason->tasks();

        if ($request->status() !== null) {
            $query->where('status', $request->status());
        }

        $paginator = $query
            ->orderBy('due_date')
            ->orderBy('title')
            ->paginate($request->perPage());
        $data = array_map(
            static fn (CultivationTask $task): array => CultivationTaskResource::make($task)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
