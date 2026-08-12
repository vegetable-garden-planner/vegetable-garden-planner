<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\ResolveGoogleUser;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleCallbackController extends Controller
{
    public function __invoke(Request $request, ResolveGoogleUser $resolveGoogleUser): RedirectResponse
    {
        $nextPath = (string) $request->session()->pull('social_login_next', '/dashboard');

        try {
            $user = $resolveGoogleUser->execute(Socialite::driver('google')->user());
        } catch (Throwable $exception) {
            report($exception);

            return redirect()->away($this->frontendUrl('/login?socialError=google'));
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->away($this->frontendUrl($nextPath));
    }

    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('services.frontend.url'), '/').$path;
    }
}
