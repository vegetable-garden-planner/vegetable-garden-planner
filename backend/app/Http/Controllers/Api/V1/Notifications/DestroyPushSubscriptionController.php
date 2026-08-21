<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Actions\Notifications\DeletePushSubscription;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Notifications\DestroyPushSubscriptionRequest;
use App\Models\User;
use Illuminate\Http\Response;
use LogicException;

class DestroyPushSubscriptionController extends Controller
{
    public function __invoke(DestroyPushSubscriptionRequest $request, DeletePushSubscription $action): Response
    {
        $user = $request->user();
        if (! $user instanceof User) {
            throw new LogicException('인증된 사용자 모델이 올바르지 않습니다.');
        }

        $action->execute($user, (string) $request->validated('endpoint'));

        return response()->noContent();
    }
}
