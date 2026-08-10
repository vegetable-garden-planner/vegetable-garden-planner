<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Auth;
use LogicException;

final class AuthenticateUser
{
    /**
     * @throws AuthenticationException
     */
    public function execute(string $email, string $password): User
    {
        $authenticated = Auth::attempt([
            'email' => $email,
            'password' => $password,
            'status' => UserStatus::Active->value,
        ]);

        if (! $authenticated) {
            throw new AuthenticationException('이메일 또는 비밀번호를 확인해 주세요.');
        }

        $user = Auth::user();

        if (! $user instanceof User) {
            throw new LogicException('인증된 사용자 모델이 올바르지 않습니다.');
        }

        return $user;
    }
}
