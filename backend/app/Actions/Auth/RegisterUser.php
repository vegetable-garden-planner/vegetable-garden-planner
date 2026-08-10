<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Exceptions\ApiConflictException;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;

final class RegisterUser
{
    public function execute(string $email, string $nickname, string $password): User
    {
        try {
            return User::query()->create([
                'email' => $email,
                'nickname' => $nickname,
                'password' => $password,
                'role' => UserRole::Member,
                'status' => UserStatus::Active,
            ]);
        } catch (UniqueConstraintViolationException $exception) {
            throw new ApiConflictException(
                'EMAIL_ALREADY_REGISTERED',
                '이미 가입된 이메일입니다.',
                $exception,
            );
        }
    }
}
