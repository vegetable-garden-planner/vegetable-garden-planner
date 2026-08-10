<?php

declare(strict_types=1);

namespace App\Http\Responses;

use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

final class AuthSessionResponse
{
    public static function make(User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'data' => [
                'user' => UserResource::make($user)->resolve(),
            ],
        ], $status);
    }
}
