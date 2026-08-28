<?php

declare(strict_types=1);

namespace App\Services\Auth;

use Illuminate\Support\Facades\Http;
use RuntimeException;

final class KakaoLoginClient
{
    /** @return array<string, mixed> */
    public function fetchProfile(string $code): array
    {
        $tokenPayload = [
            'grant_type' => 'authorization_code',
            'client_id' => (string) config('services.kakao.rest_api_key'),
            'redirect_uri' => (string) config('services.kakao.redirect'),
            'code' => $code,
        ];
        $clientSecret = trim((string) config('services.kakao.client_secret'));
        if ($clientSecret !== '') {
            $tokenPayload['client_secret'] = $clientSecret;
        }

        $tokenResponse = Http::asForm()
            ->acceptJson()
            ->timeout(10)
            ->post('https://kauth.kakao.com/oauth/token', $tokenPayload);
        $tokenResponse->throw();

        $accessToken = trim((string) $tokenResponse->json('access_token'));
        if ($accessToken === '') {
            throw new RuntimeException('카카오 액세스 토큰을 받지 못했습니다.');
        }

        $profileResponse = Http::withToken($accessToken)
            ->acceptJson()
            ->timeout(10)
            ->get('https://kapi.kakao.com/v2/user/me');
        $profileResponse->throw();

        $profile = $profileResponse->json();
        if (! is_array($profile)) {
            throw new RuntimeException('카카오 사용자 정보 응답이 올바르지 않습니다.');
        }

        return $profile;
    }
}
