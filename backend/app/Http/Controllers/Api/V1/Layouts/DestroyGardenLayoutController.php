<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Layouts;

use App\Actions\Layouts\DeleteGardenLayout;
use App\Http\Controllers\Controller;
use App\Models\GrowingSeason;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DestroyGardenLayoutController extends Controller
{
    public function __invoke(
        Request $request,
        GrowingSeason $growingSeason,
        DeleteGardenLayout $deleteGardenLayout,
    ): Response {
        Gate::authorize('update', $growingSeason);
        $deleteGardenLayout->execute($growingSeason, $request->header('If-Match'));

        return response()->noContent();
    }
}
