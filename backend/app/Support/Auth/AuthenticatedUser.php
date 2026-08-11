<?php

declare(strict_types=1);

namespace App\Support\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use LogicException;

final class AuthenticatedUser
{
    public static function from(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User) {
            throw new LogicException('인증된 사용자 모델이 올바르지 않습니다.');
        }

        return $user;
    }
}
