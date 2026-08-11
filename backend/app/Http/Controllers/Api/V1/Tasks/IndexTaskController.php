<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Tasks\IndexTaskRequest;
use App\Http\Resources\Api\V1\CultivationTaskResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\CultivationTask;
use App\Support\Auth\AuthenticatedUser;
use Illuminate\Http\JsonResponse;

class IndexTaskController extends Controller
{
    public function __invoke(IndexTaskRequest $request): JsonResponse
    {
        $user = AuthenticatedUser::from($request);
        $query = CultivationTask::query()
            ->whereHas(
                'growingSeason.growingSpace',
                static fn ($query) => $query->where('owner_id', $user->id),
            );

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
