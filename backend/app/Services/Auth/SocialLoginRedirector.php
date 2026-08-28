<?php

declare(strict_types=1);

namespace App\Services\Auth;

final class SocialLoginRedirector
{
    public function safePath(mixed $path): string
    {
        if (! is_string($path) || ! str_starts_with($path, '/') || str_starts_with($path, '//') || str_contains($path, '\\')) {
            return '/dashboard';
        }

        return $path;
    }

    public function frontendUrl(string $path): string
    {
        return rtrim((string) config('services.frontend.url'), '/').$path;
    }
}
