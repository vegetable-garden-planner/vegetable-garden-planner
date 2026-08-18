<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\SocialLoginRedirector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

class GoogleRedirectController extends Controller
{
    public function __invoke(Request $request, SocialLoginRedirector $redirector): RedirectResponse
    {
        if (blank(config('services.google.client_id')) || blank(config('services.google.client_secret'))) {
            return redirect()->away(
                $redirector->frontendUrl('/login?socialError=google-config'),
            );
        }

        $request->session()->put('social_login_next', $redirector->safePath($request->query('next')));

        return Socialite::driver('google')
            ->scopes(['openid', 'profile', 'email'])
            ->redirect();
    }
}
