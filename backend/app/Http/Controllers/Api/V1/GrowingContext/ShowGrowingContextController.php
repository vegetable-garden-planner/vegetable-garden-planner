<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\GrowingContext;

use App\Domain\GrowingContext\BuildGrowingContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\GrowingContextResource;
use App\Support\Auth\AuthenticatedUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShowGrowingContextController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = AuthenticatedUser::from($request);
        $context = BuildGrowingContext::for($user);

        return response()->json(['data' => GrowingContextResource::make($context)->resolve()]);
    }
}
