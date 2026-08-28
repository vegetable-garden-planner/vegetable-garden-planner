<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Assistant\AskAiChatController;
use App\Http\Controllers\Api\V1\Assistant\AskGardenAssistantController;
use App\Http\Controllers\Api\V1\Auth\CheckEmailAvailabilityController;
use App\Http\Controllers\Api\V1\Auth\CurrentUserController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\WithdrawAccountController;
use App\Http\Controllers\Api\V1\Billing\CancelSubscriptionController;
use App\Http\Controllers\Api\V1\Billing\ShowSubscriptionController;
use App\Http\Controllers\Api\V1\Billing\StoreSubscriptionController;
use App\Http\Controllers\Api\V1\Billing\TossPaymentsWebhookController;
use App\Http\Controllers\Api\V1\ContainerPlacements\IndexContainerPlacementsController;
use App\Http\Controllers\Api\V1\ContainerPlacements\PutContainerPlacementsController;
use App\Http\Controllers\Api\V1\ContainerPlacements\ShowContainerPlacementsController;
use App\Http\Controllers\Api\V1\Crops\IndexCropController;
use App\Http\Controllers\Api\V1\Crops\IndexCropSourceController;
use App\Http\Controllers\Api\V1\Crops\ShowCropController;
use App\Http\Controllers\Api\V1\GrowingContext\ShowGrowingContextController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\Layouts\DestroyGardenLayoutController;
use App\Http\Controllers\Api\V1\Layouts\IndexGardenLayoutController;
use App\Http\Controllers\Api\V1\Layouts\PutGardenLayoutController;
use App\Http\Controllers\Api\V1\Layouts\ShowGardenLayoutController;
use App\Http\Controllers\Api\V1\Locations\GeocodeAddressController;
use App\Http\Controllers\Api\V1\Memos\DestroySpaceMemoController;
use App\Http\Controllers\Api\V1\Memos\IndexSpaceMemoController;
use App\Http\Controllers\Api\V1\Memos\StoreSpaceMemoController;
use App\Http\Controllers\Api\V1\Memos\UpdateSpaceMemoController;
use App\Http\Controllers\Api\V1\Notifications\DestroyPushSubscriptionController;
use App\Http\Controllers\Api\V1\Notifications\StorePushSubscriptionController;
use App\Http\Controllers\Api\V1\Records\DestroyRecordController;
use App\Http\Controllers\Api\V1\Records\DestroyRecordPhotoController;
use App\Http\Controllers\Api\V1\Records\IndexRecordController;
use App\Http\Controllers\Api\V1\Records\IndexSeasonRecordController;
use App\Http\Controllers\Api\V1\Records\StoreRecordPhotoController;
use App\Http\Controllers\Api\V1\Records\StoreSeasonRecordController;
use App\Http\Controllers\Api\V1\Records\UpdateRecordController;
use App\Http\Controllers\Api\V1\Seasons\DestroySeasonController;
use App\Http\Controllers\Api\V1\Seasons\IndexSeasonController;
use App\Http\Controllers\Api\V1\Seasons\ShowSeasonController;
use App\Http\Controllers\Api\V1\Seasons\ShowSeasonSummaryController;
use App\Http\Controllers\Api\V1\Seasons\StoreSeasonController;
use App\Http\Controllers\Api\V1\Seasons\UpdateSeasonController;
use App\Http\Controllers\Api\V1\Spaces\DestroySpaceController;
use App\Http\Controllers\Api\V1\Spaces\IndexSpaceController;
use App\Http\Controllers\Api\V1\Spaces\ShowSpaceController;
use App\Http\Controllers\Api\V1\Spaces\StoreSpaceController;
use App\Http\Controllers\Api\V1\Spaces\UpdateSpaceController;
use App\Http\Controllers\Api\V1\Tasks\DestroySeasonTaskController;
use App\Http\Controllers\Api\V1\Tasks\DestroyTaskController;
use App\Http\Controllers\Api\V1\Tasks\GenerateSeasonTaskController;
use App\Http\Controllers\Api\V1\Tasks\IndexSeasonTaskController;
use App\Http\Controllers\Api\V1\Tasks\IndexTaskController;
use App\Http\Controllers\Api\V1\Tasks\UpdateTaskController;
use App\Http\Controllers\Api\V1\Watering\CompleteWateringController;
use App\Http\Controllers\Api\V1\Watering\DestroyWateringScheduleController;
use App\Http\Controllers\Api\V1\Watering\IndexSeasonWateringScheduleController;
use App\Http\Controllers\Api\V1\Watering\IndexWateringLogController;
use App\Http\Controllers\Api\V1\Watering\IndexWateringScheduleController;
use App\Http\Controllers\Api\V1\Watering\IndexWateringSnoozeController;
use App\Http\Controllers\Api\V1\Watering\ReopenWateringCompletionController;
use App\Http\Controllers\Api\V1\Watering\ShowWateringScheduleController;
use App\Http\Controllers\Api\V1\Watering\SnoozeWateringController;
use App\Http\Controllers\Api\V1\Watering\StoreWateringScheduleController;
use App\Http\Controllers\Api\V1\Watering\UpdateWateringScheduleController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthCheckController::class);
    Route::get('/crops', IndexCropController::class);
    Route::get('/crops/{crop}', ShowCropController::class);
    Route::get('/crop-sources', IndexCropSourceController::class);

    Route::prefix('auth')->group(function (): void {
        Route::post('/email-availability', CheckEmailAvailabilityController::class)
            ->middleware('throttle:20,1');
        Route::post('/register', RegisterController::class);
        Route::post('/login', LoginController::class);
        Route::post('/logout', LogoutController::class)->middleware('auth:sanctum');
    });

    Route::post('/webhooks/toss-payments', TossPaymentsWebhookController::class)->middleware('throttle:60,1');

    Route::get('/me', CurrentUserController::class)->middleware('auth:sanctum');
    Route::delete('/me', WithdrawAccountController::class)->middleware('auth:sanctum');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/locations/geocode', GeocodeAddressController::class)
            ->middleware('throttle:30,1');

        Route::post('/push-subscriptions', StorePushSubscriptionController::class);
        Route::delete('/push-subscriptions', DestroyPushSubscriptionController::class);

        Route::post('/subscriptions', StoreSubscriptionController::class);
        Route::get('/subscriptions/me', ShowSubscriptionController::class);
        Route::delete('/subscriptions/{subscription}', CancelSubscriptionController::class);

        Route::get('/spaces', IndexSpaceController::class);
        Route::post('/spaces', StoreSpaceController::class);
        Route::get('/spaces/{growingSpace}', ShowSpaceController::class);
        Route::patch('/spaces/{growingSpace}', UpdateSpaceController::class);
        Route::delete('/spaces/{growingSpace}', DestroySpaceController::class);
        Route::get('/spaces/{growingSpace}/memos', IndexSpaceMemoController::class);
        Route::post('/spaces/{growingSpace}/memos', StoreSpaceMemoController::class);
        Route::patch('/memos/{spaceMemo}', UpdateSpaceMemoController::class);
        Route::delete('/memos/{spaceMemo}', DestroySpaceMemoController::class);

        Route::get('/layouts', IndexGardenLayoutController::class);
        Route::get('/container-placements', IndexContainerPlacementsController::class);
        Route::get('/growing-context', ShowGrowingContextController::class);
        Route::post('/ai/chat', AskAiChatController::class)->middleware('throttle:10,1');

        Route::get('/tasks', IndexTaskController::class);
        Route::patch('/tasks/{cultivationTask}', UpdateTaskController::class);
        Route::delete('/tasks/{cultivationTask}', DestroyTaskController::class);

        Route::get('/records', IndexRecordController::class);
        Route::patch('/records/{cultivationRecord}', UpdateRecordController::class);
        Route::delete('/records/{cultivationRecord}', DestroyRecordController::class);
        Route::post('/records/{cultivationRecord}/photo', StoreRecordPhotoController::class);
        Route::delete('/records/{cultivationRecord}/photo', DestroyRecordPhotoController::class);

        Route::get('/watering-schedules', IndexWateringScheduleController::class);
        Route::get('/watering-schedules/{wateringSchedule}', ShowWateringScheduleController::class);
        Route::patch('/watering-schedules/{wateringSchedule}', UpdateWateringScheduleController::class);
        Route::delete('/watering-schedules/{wateringSchedule}', DestroyWateringScheduleController::class);
        Route::get('/watering-schedules/{wateringSchedule}/logs', IndexWateringLogController::class);
        Route::post('/watering-schedules/{wateringSchedule}/complete', CompleteWateringController::class);
        Route::delete(
            '/watering-schedules/{wateringSchedule}/logs/{wateringLog}',
            ReopenWateringCompletionController::class,
        );
        Route::get('/watering-schedules/{wateringSchedule}/snoozes', IndexWateringSnoozeController::class);
        Route::post('/watering-schedules/{wateringSchedule}/snoozes', SnoozeWateringController::class);

        Route::get('/seasons', IndexSeasonController::class);
        Route::post('/seasons', StoreSeasonController::class);
        Route::get('/seasons/{growingSeason}', ShowSeasonController::class);
        Route::patch('/seasons/{growingSeason}', UpdateSeasonController::class);
        Route::delete('/seasons/{growingSeason}', DestroySeasonController::class);
        Route::get('/seasons/{growingSeason}/summary', ShowSeasonSummaryController::class);
        Route::post('/seasons/{growingSeason}/assistant/ask', AskGardenAssistantController::class);
        Route::get('/seasons/{growingSeason}/layout', ShowGardenLayoutController::class);
        Route::put('/seasons/{growingSeason}/layout', PutGardenLayoutController::class);
        Route::delete('/seasons/{growingSeason}/layout', DestroyGardenLayoutController::class);
        Route::get('/seasons/{growingSeason}/container-placements', ShowContainerPlacementsController::class);
        Route::put('/seasons/{growingSeason}/container-placements', PutContainerPlacementsController::class);
        Route::get('/seasons/{growingSeason}/tasks', IndexSeasonTaskController::class);
        Route::post('/seasons/{growingSeason}/tasks/generate', GenerateSeasonTaskController::class);
        Route::delete('/seasons/{growingSeason}/tasks', DestroySeasonTaskController::class);
        Route::get('/seasons/{growingSeason}/records', IndexSeasonRecordController::class);
        Route::post('/seasons/{growingSeason}/records', StoreSeasonRecordController::class);
        Route::get(
            '/seasons/{growingSeason}/watering-schedules',
            IndexSeasonWateringScheduleController::class,
        );
        Route::post(
            '/seasons/{growingSeason}/watering-schedules',
            StoreWateringScheduleController::class,
        );
    });
});
