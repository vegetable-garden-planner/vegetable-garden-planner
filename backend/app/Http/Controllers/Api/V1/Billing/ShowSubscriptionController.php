<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Billing;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\SubscriptionResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;

class ShowSubscriptionController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            throw new LogicException('인증된 사용자 모델이 올바르지 않습니다.');
        }

        $subscription = Subscription::query()->where('user_id', $user->id)->first();
        abort_if($subscription === null, 404);

        return VersionedResourceResponse::make(
            SubscriptionResource::make($subscription),
            $subscription->version,
        );
    }
}
