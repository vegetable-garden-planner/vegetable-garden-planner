<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Seasons;

use App\Domain\Seasons\BuildSeasonSummary;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\SeasonSummaryResource;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ShowSeasonSummaryController extends Controller
{
    public function __invoke(GrowingSeason $growingSeason): JsonResponse
    {
        Gate::authorize('view', $growingSeason);

        $summary = BuildSeasonSummary::for($growingSeason);

        return response()->json(['data' => SeasonSummaryResource::make($summary)->resolve()]);
    }
}
