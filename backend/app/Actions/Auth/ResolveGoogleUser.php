<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\AbstractUser;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use RuntimeException;

final class ResolveGoogleUser
{
    public function execute(SocialiteUser $googleUser): User
    {
        $providerId = trim((string) $googleUser->getId());
        $email = mb_strtolower(trim((string) $googleUser->getEmail()));

        if ($providerId === '' || $email === '') {
            throw new RuntimeException('Google 계정에서 필수 이메일 정보를 받지 못했습니다.');
        }

        if (! $this->hasVerifiedEmail($googleUser)) {
            throw new RuntimeException('이메일이 확인된 Google 계정만 사용할 수 있습니다.');
        }

        return DB::transaction(function () use ($googleUser, $providerId, $email): User {
            $account = SocialAccount::query()
                ->where('provider', 'google')
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
                    'nickname' => $this->nickname($googleUser, $email),
                    'password' => Str::password(40),
                    'email_verified_at' => now(),
                    'role' => UserRole::Member,
                    'status' => UserStatus::Active,
                ]);
            } elseif ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            $user->socialAccounts()->create([
                'provider' => 'google',
                'provider_user_id' => $providerId,
            ]);

            return $this->ensureActive($user);
        });
    }

    private function hasVerifiedEmail(SocialiteUser $user): bool
    {
        if (! $user instanceof AbstractUser) {
            return false;
        }

        $raw = $user->getRaw();

        return ($raw['verified_email'] ?? $raw['email_verified'] ?? false) === true;
    }

    private function nickname(SocialiteUser $user, string $email): string
    {
        $candidate = trim((string) ($user->getName() ?: $user->getNickname()));
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
