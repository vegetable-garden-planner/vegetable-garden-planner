<?php

declare(strict_types=1);

namespace App\Actions\Billing;

use App\Enums\SubscriptionStatus;
use App\Mail\SubscriptionCanceledMail;
use App\Models\Subscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

final class RecordFailedSubscriptionCharge
{
    public const MAX_RETRY_ATTEMPTS = 3;

    private const RETRY_INTERVAL_DAYS = 3;

    public function execute(Subscription $subscription): void
    {
        if ($subscription->status === SubscriptionStatus::Canceled) {
            return;
        }

        $retryCount = $subscription->past_due_retry_count + 1;

        if ($retryCount >= self::MAX_RETRY_ATTEMPTS) {
            $subscription->update([
                'status' => SubscriptionStatus::Canceled,
                'canceled_at' => now(),
                'past_due_retry_count' => $retryCount,
                'next_retry_at' => null,
                'version' => DB::raw('version + 1'),
            ]);
            Mail::to($subscription->user)->queue(new SubscriptionCanceledMail($subscription->user));

            return;
        }

        $subscription->update([
            'status' => SubscriptionStatus::PastDue,
            'past_due_retry_count' => $retryCount,
            'next_retry_at' => now()->addDays(self::RETRY_INTERVAL_DAYS),
            'version' => DB::raw('version + 1'),
        ]);
    }
}
