<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Billing;

use App\Actions\Billing\CancelSubscription;
use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class CancelSubscriptionController extends Controller
{
    public function __invoke(
        Request $request,
        Subscription $subscription,
        CancelSubscription $action,
    ): Response {
        Gate::authorize('delete', $subscription);
        $action->execute($subscription, $request->header('If-Match'));

        return response()->noContent();
    }
}
