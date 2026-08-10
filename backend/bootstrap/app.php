<?php

declare(strict_types=1);

use App\Exceptions\ApiConflictException;
use App\Http\Responses\ApiErrorResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $exception, Request $request): ?JsonResponse {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiErrorResponse::make(
                'VALIDATION_FAILED',
                '입력값을 확인해 주세요.',
                422,
                $exception->errors(),
            );
        });

        $exceptions->render(function (AuthenticationException $exception, Request $request): ?JsonResponse {
            if (! $request->is('api/*')) {
                return null;
            }

            $message = $exception->getMessage() === 'Unauthenticated.'
                ? '로그인이 필요합니다.'
                : $exception->getMessage();

            return ApiErrorResponse::make(
                'UNAUTHENTICATED',
                $message,
                401,
            );
        });

        $exceptions->render(function (ApiConflictException $exception, Request $request): ?JsonResponse {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiErrorResponse::make(
                $exception->errorCode(),
                $exception->getMessage(),
                409,
            );
        });
    })->create();
