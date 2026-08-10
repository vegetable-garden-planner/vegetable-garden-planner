<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Spaces;

use App\Actions\Spaces\DeleteGrowingSpace;
use App\Http\Controllers\Controller;
use App\Models\GrowingSpace;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DestroySpaceController extends Controller
{
    public function __invoke(
        Request $request,
        GrowingSpace $growingSpace,
        DeleteGrowingSpace $deleteGrowingSpace,
    ): Response {
        Gate::authorize('delete', $growingSpace);
        $deleteGrowingSpace->execute($growingSpace, $request->header('If-Match'));

        return response()->noContent();
    }
}
