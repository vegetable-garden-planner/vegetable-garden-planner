<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Auth\CurrentUserController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Crops\IndexCropController;
use App\Http\Controllers\Api\V1\Crops\IndexCropSourceController;
use App\Http\Controllers\Api\V1\Crops\ShowCropController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\Layouts\DestroyGardenLayoutController;
use App\Http\Controllers\Api\V1\Layouts\IndexGardenLayoutController;
use App\Http\Controllers\Api\V1\Layouts\PutGardenLayoutController;
use App\Http\Controllers\Api\V1\Layouts\ShowGardenLayoutController;
use App\Http\Controllers\Api\V1\Seasons\DestroySeasonController;
use App\Http\Controllers\Api\V1\Seasons\IndexSeasonController;
use App\Http\Controllers\Api\V1\Seasons\ShowSeasonController;
use App\Http\Controllers\Api\V1\Seasons\StoreSeasonController;
use App\Http\Controllers\Api\V1\Seasons\UpdateSeasonController;
use App\Http\Controllers\Api\V1\Spaces\DestroySpaceController;
use App\Http\Controllers\Api\V1\Spaces\IndexSpaceController;
use App\Http\Controllers\Api\V1\Spaces\ShowSpaceController;
use App\Http\Controllers\Api\V1\Spaces\StoreSpaceController;
use App\Http\Controllers\Api\V1\Spaces\UpdateSpaceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthCheckController::class);
    Route::get('/crops', IndexCropController::class);
    Route::get('/crops/{crop}', ShowCropController::class);
    Route::get('/crop-sources', IndexCropSourceController::class);

    Route::prefix('auth')->group(function (): void {
        Route::post('/register', RegisterController::class);
        Route::post('/login', LoginController::class);
        Route::post('/logout', LogoutController::class)->middleware('auth:sanctum');
    });

    Route::get('/me', CurrentUserController::class)->middleware('auth:sanctum');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/spaces', IndexSpaceController::class);
        Route::post('/spaces', StoreSpaceController::class);
        Route::get('/spaces/{growingSpace}', ShowSpaceController::class);
        Route::patch('/spaces/{growingSpace}', UpdateSpaceController::class);
        Route::delete('/spaces/{growingSpace}', DestroySpaceController::class);

        Route::get('/layouts', IndexGardenLayoutController::class);

        Route::get('/seasons', IndexSeasonController::class);
        Route::post('/seasons', StoreSeasonController::class);
        Route::get('/seasons/{growingSeason}', ShowSeasonController::class);
        Route::patch('/seasons/{growingSeason}', UpdateSeasonController::class);
        Route::delete('/seasons/{growingSeason}', DestroySeasonController::class);
        Route::get('/seasons/{growingSeason}/layout', ShowGardenLayoutController::class);
        Route::put('/seasons/{growingSeason}/layout', PutGardenLayoutController::class);
        Route::delete('/seasons/{growingSeason}/layout', DestroyGardenLayoutController::class);
    });
});
