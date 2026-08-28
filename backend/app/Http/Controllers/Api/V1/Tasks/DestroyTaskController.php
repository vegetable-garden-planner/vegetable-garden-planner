<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Actions\Tasks\DeleteCultivationTask;
use App\Http\Controllers\Controller;
use App\Models\CultivationTask;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DestroyTaskController extends Controller
{
    public function __invoke(
        Request $request,
        CultivationTask $cultivationTask,
        DeleteCultivationTask $deleteTask,
    ): Response {
        Gate::authorize('update', $cultivationTask);
        $deleteTask->execute($cultivationTask, $request->header('If-Match'));

        return response()->noContent();
    }
}
