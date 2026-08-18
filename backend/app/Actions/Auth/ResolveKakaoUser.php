<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;

final class ResolveKakaoUser
{
    public function __construct(private readonly ResolveSocialUser $resolveSocialUser) {}

    /** @param array<string, mixed> $profile */
    public function execute(array $profile): User
    {
        $account = is_array($profile['kakao_account'] ?? null)
            ? $profile['kakao_account']
            : [];
        $profileDetails = is_array($account['profile'] ?? null)
            ? $account['profile']
            : [];

        return $this->resolveSocialUser->execute(
            provider: 'kakao',
            providerId: (string) ($profile['id'] ?? ''),
            email: (string) ($account['email'] ?? ''),
            nickname: (string) ($profileDetails['nickname'] ?? ''),
            emailVerified: ($account['is_email_valid'] ?? false) === true
                && ($account['is_email_verified'] ?? false) === true,
        );
    }
}
