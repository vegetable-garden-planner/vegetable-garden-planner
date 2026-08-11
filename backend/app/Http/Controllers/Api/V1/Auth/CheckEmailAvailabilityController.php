<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\CheckEmailAvailabilityRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

final class CheckEmailAvailabilityController extends Controller
{
    public function __invoke(CheckEmailAvailabilityRequest $request): JsonResponse
    {
        $available = User::query()
            ->where('email', $request->email())
            ->doesntExist();

        return response()->json([
            'data' => ['available' => $available],
        ]);
    }
}
