<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Actions\Tasks\GenerateCultivationTasks;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\CultivationTaskResource;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class GenerateSeasonTaskController extends Controller
{
    public function __invoke(
        Request $request,
        GrowingSeason $growingSeason,
        GenerateCultivationTasks $generateTasks,
    ): JsonResponse {
        Gate::authorize('update', $growingSeason);
        $tasks = $generateTasks->execute($growingSeason, $request->header('If-Match'));

        return response()->json([
            'data' => CultivationTaskResource::collection($tasks)->resolve(),
        ], 201);
    }
}
