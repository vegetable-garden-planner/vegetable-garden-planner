<?php

declare(strict_types=1);

namespace App\Actions\Billing;

use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class CancelSubscription
{
    public function execute(Subscription $subscription, ?string $ifMatch): Subscription
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        $updated = Subscription::query()
            ->whereKey($subscription->id)
            ->where('version', $expectedVersion)
            ->update([
                'status' => SubscriptionStatus::Canceled,
                'canceled_at' => now(),
                'version' => DB::raw('version + 1'),
                'updated_at' => now(),
            ]);

        if ($updated !== 1) {
            EntityTag::versionConflict();
        }

        return $subscription->refresh();
    }
}
