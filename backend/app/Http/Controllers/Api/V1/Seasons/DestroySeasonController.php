<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Seasons;

use App\Actions\Seasons\DeleteGrowingSeason;
use App\Http\Controllers\Controller;
use App\Models\GrowingSeason;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DestroySeasonController extends Controller
{
    public function __invoke(
        Request $request,
        GrowingSeason $growingSeason,
        DeleteGrowingSeason $deleteGrowingSeason,
    ): Response {
        Gate::authorize('delete', $growingSeason);
        $deleteGrowingSeason->execute($growingSeason, $request->header('If-Match'));

        return response()->noContent();
    }
}
