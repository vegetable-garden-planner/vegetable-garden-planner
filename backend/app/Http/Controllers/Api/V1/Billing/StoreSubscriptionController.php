<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Billing;

use App\Actions\Billing\SubscribeToProPlan;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Billing\StoreSubscriptionRequest;
use App\Http\Resources\Api\V1\SubscriptionResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use LogicException;

class StoreSubscriptionController extends Controller
{
    public function __invoke(StoreSubscriptionRequest $request, SubscribeToProPlan $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            throw new LogicException('인증된 사용자 모델이 올바르지 않습니다.');
        }

        $subscription = $action->execute($user, (string) $request->validated('auth_key'));

        return VersionedResourceResponse::make(
            SubscriptionResource::make($subscription),
            $subscription->version,
            201,
        );
    }
}
