<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\ResolveKakaoUser;
use App\Http\Controllers\Controller;
use App\Services\Auth\KakaoLoginClient;
use App\Services\Auth\SocialLoginRedirector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use RuntimeException;
use Throwable;

final class KakaoCallbackController extends Controller
{
    public function __invoke(
        Request $request,
        KakaoLoginClient $kakaoLoginClient,
        ResolveKakaoUser $resolveKakaoUser,
        SocialLoginRedirector $redirector,
    ): RedirectResponse {
        $nextPath = (string) $request->session()->pull('social_login_kakao_next', '/dashboard');
        $expectedState = (string) $request->session()->pull('social_login_kakao_state', '');

        try {
            $code = $this->validatedCode($request, $expectedState);
            $user = $resolveKakaoUser->execute($kakaoLoginClient->fetchProfile($code));
        } catch (Throwable $exception) {
            report($exception);

            return redirect()->away($redirector->frontendUrl('/login?socialError=kakao'));
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->away($redirector->frontendUrl($nextPath));
    }

    private function validatedCode(Request $request, string $expectedState): string
    {
        $state = $request->query('state');
        $code = $request->query('code');
        if (
            $request->filled('error')
            || ! is_string($state)
            || $expectedState === ''
            || ! hash_equals($expectedState, $state)
            || ! is_string($code)
            || trim($code) === ''
        ) {
            throw new RuntimeException('카카오 로그인 요청을 확인할 수 없습니다.');
        }

        return trim($code);
    }
}
