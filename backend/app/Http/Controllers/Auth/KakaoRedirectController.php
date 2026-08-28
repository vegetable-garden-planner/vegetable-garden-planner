<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\SocialLoginRedirector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class KakaoRedirectController extends Controller
{
    public function __invoke(Request $request, SocialLoginRedirector $redirector): RedirectResponse
    {
        $clientId = trim((string) config('services.kakao.rest_api_key'));
        $redirectUri = trim((string) config('services.kakao.redirect'));
        if ($clientId === '' || $redirectUri === '') {
            return redirect()->away($redirector->frontendUrl('/login?socialError=kakao-config'));
        }

        $state = Str::random(40);
        $request->session()->put([
            'social_login_kakao_state' => $state,
            'social_login_kakao_next' => $redirector->safePath($request->query('next')),
        ]);

        $query = http_build_query([
            'response_type' => 'code',
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'state' => $state,
            'scope' => 'profile_nickname,account_email',
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect()->away('https://kauth.kakao.com/oauth/authorize?'.$query);
    }
}
