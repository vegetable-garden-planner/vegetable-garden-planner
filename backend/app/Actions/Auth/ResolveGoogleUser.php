<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Socialite\AbstractUser;
use Laravel\Socialite\Contracts\User as SocialiteUser;

final class ResolveGoogleUser
{
    public function __construct(private readonly ResolveSocialUser $resolveSocialUser) {}

    public function execute(SocialiteUser $googleUser): User
    {
        $providerId = trim((string) $googleUser->getId());
        $email = mb_strtolower(trim((string) $googleUser->getEmail()));

        return $this->resolveSocialUser->execute(
            provider: 'google',
            providerId: $providerId,
            email: $email,
            nickname: $this->nickname($googleUser, $email),
            emailVerified: $this->hasVerifiedEmail($googleUser),
        );
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
}
