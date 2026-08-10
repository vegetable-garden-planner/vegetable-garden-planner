<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CultivationTaskController;
use App\Http\Controllers\Api\V1\GardenLayoutController;
use App\Http\Controllers\Api\V1\GrowingSeasonController;
use App\Http\Controllers\Api\V1\GrowingSpaceController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthCheckController::class);

    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::apiResource('spaces', GrowingSpaceController::class);
        Route::apiResource('seasons', GrowingSeasonController::class);

        Route::get('/layouts', [GardenLayoutController::class, 'index']);
        Route::get('/seasons/{season}/layout', [GardenLayoutController::class, 'show']);
        Route::put('/seasons/{season}/layout', [GardenLayoutController::class, 'upsert']);
        Route::delete('/seasons/{season}/layout', [GardenLayoutController::class, 'destroy']);

        Route::get('/tasks', [CultivationTaskController::class, 'index']);
        Route::get('/seasons/{season}/tasks', [CultivationTaskController::class, 'forSeason']);
        Route::put('/seasons/{season}/tasks', [CultivationTaskController::class, 'replace']);
        Route::patch('/tasks/{task}', [CultivationTaskController::class, 'update']);
        Route::delete('/tasks/{task}', [CultivationTaskController::class, 'destroy']);
    });
});
