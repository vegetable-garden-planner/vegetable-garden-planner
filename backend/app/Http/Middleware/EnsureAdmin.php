<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless(
            $user !== null
            && $user->role === UserRole::Admin
            && $user->status === UserStatus::Active,
            403,
            '관리자만 접근할 수 있습니다.',
        );

        return $next($request);
    }
}
