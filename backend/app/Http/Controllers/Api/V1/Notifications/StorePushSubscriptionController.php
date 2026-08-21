<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Actions\Notifications\SavePushSubscription;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Notifications\StorePushSubscriptionRequest;
use App\Models\User;
use Illuminate\Http\Response;
use LogicException;

class StorePushSubscriptionController extends Controller
{
    public function __invoke(StorePushSubscriptionRequest $request, SavePushSubscription $action): Response
    {
        $user = $request->user();
        if (! $user instanceof User) {
            throw new LogicException('인증된 사용자 모델이 올바르지 않습니다.');
        }

        $validated = $request->validated();
        $action->execute($user, (string) $validated['endpoint'], [
            'p256dh' => (string) $validated['keys']['p256dh'],
            'auth' => (string) $validated['keys']['auth'],
        ]);

        return response()->noContent();
    }
}
