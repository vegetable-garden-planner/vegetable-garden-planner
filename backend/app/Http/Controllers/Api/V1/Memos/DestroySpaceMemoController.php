<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Memos;

use App\Actions\Memos\DeleteSpaceMemo;
use App\Http\Controllers\Controller;
use App\Models\SpaceMemo;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DestroySpaceMemoController extends Controller
{
    public function __invoke(
        Request $request,
        SpaceMemo $spaceMemo,
        DeleteSpaceMemo $deleteSpaceMemo,
    ): Response {
        Gate::authorize('update', $spaceMemo);
        $deleteSpaceMemo->execute($spaceMemo, $request->header('If-Match'));

        return response()->noContent();
    }
}
