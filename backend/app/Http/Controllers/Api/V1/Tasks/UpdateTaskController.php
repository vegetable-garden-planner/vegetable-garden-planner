<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Actions\Tasks\UpdateCultivationTask;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Tasks\UpdateTaskRequest;
use App\Http\Resources\Api\V1\CultivationTaskResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\CultivationTask;
use Illuminate\Http\JsonResponse;

class UpdateTaskController extends Controller
{
    public function __invoke(
        UpdateTaskRequest $request,
        CultivationTask $cultivationTask,
        UpdateCultivationTask $updateTask,
    ): JsonResponse {
        $task = $updateTask->execute(
            $cultivationTask,
            $request->persistenceAttributes(),
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            CultivationTaskResource::make($task),
            $task->version,
        );
    }
}
