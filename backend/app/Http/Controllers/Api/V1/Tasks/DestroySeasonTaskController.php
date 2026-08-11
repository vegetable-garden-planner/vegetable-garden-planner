<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Actions\Tasks\DeleteSeasonCultivationTasks;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Tasks\DeleteSeasonTasksRequest;
use App\Models\GrowingSeason;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DestroySeasonTaskController extends Controller
{
    public function __invoke(
        DeleteSeasonTasksRequest $request,
        GrowingSeason $growingSeason,
        DeleteSeasonCultivationTasks $deleteTasks,
    ): Response {
        Gate::authorize('update', $growingSeason);
        $deleteTasks->execute($growingSeason, $request->taskVersions());

        return response()->noContent();
    }
}
