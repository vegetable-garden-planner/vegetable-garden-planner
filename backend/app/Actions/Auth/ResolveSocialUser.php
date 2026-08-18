<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class ResolveSocialUser
{
    public function execute(
        string $provider,
        string $providerId,
        string $email,
        string $nickname,
        bool $emailVerified,
    ): User {
        $providerId = trim($providerId);
        $email = mb_strtolower(trim($email));

        if ($providerId === '' || $email === '') {
            throw new RuntimeException('소셜 계정에서 필수 이메일 정보를 받지 못했습니다.');
        }

        if (! $emailVerified) {
            throw new RuntimeException('이메일이 확인된 소셜 계정만 사용할 수 있습니다.');
        }

        return DB::transaction(function () use ($provider, $providerId, $email, $nickname): User {
            $account = SocialAccount::query()
                ->where('provider', $provider)
                ->where('provider_user_id', $providerId)
                ->lockForUpdate()
                ->first();

            if ($account !== null) {
                return $this->ensureActive($account->user()->firstOrFail());
            }

            $user = User::query()->where('email', $email)->lockForUpdate()->first();
            if ($user === null) {
                $user = User::query()->create([
                    'email' => $email,
                    'nickname' => $this->nickname($nickname, $email),
                    'password' => Str::password(40),
                    'role' => UserRole::Member,
                    'status' => UserStatus::Active,
                ]);
                $user->forceFill(['email_verified_at' => now()])->save();
            } elseif ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            $user->socialAccounts()->create([
                'provider' => $provider,
                'provider_user_id' => $providerId,
            ]);

            return $this->ensureActive($user);
        });
    }

    private function nickname(string $nickname, string $email): string
    {
        $candidate = trim($nickname);
        if ($candidate === '') {
            $candidate = (string) Str::before($email, '@');
        }

        return mb_substr($candidate, 0, 20);
    }

    private function ensureActive(User $user): User
    {
        if ($user->status !== UserStatus::Active) {
            throw new RuntimeException('사용할 수 없는 계정입니다.');
        }

        return $user;
    }
}
