<?php

declare(strict_types=1);

namespace App\Actions\Billing;

use App\Enums\SubscriptionPaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class ReconcileSubscriptionWebhookEvent
{
    public function execute(string $type, string $paymentId): void
    {
        if ($paymentId === '') {
            return;
        }

        $payment = SubscriptionPayment::query()->where('portone_payment_id', $paymentId)->first();
        if ($payment === null) {
            Log::info('알 수 없는 결제 웹훅을 수신했습니다.', ['paymentId' => $paymentId, 'type' => $type]);

            return;
        }

        match ($type) {
            'Transaction.Paid' => $this->markPaid($payment),
            'Transaction.Failed', 'Transaction.Cancelled' => $this->markFailed($payment),
            'BillingKey.Deleted' => $this->markSubscriptionPastDue($payment->subscription),
            default => null,
        };
    }

    private function markPaid(SubscriptionPayment $payment): void
    {
        if ($payment->status === SubscriptionPaymentStatus::Paid) {
            return;
        }

        $payment->update([
            'status' => SubscriptionPaymentStatus::Paid,
            'paid_at' => now(),
            'failure_reason' => null,
        ]);
    }

    private function markFailed(SubscriptionPayment $payment): void
    {
        $payment->update([
            'status' => SubscriptionPaymentStatus::Failed,
            'failure_reason' => '웹훅으로 결제 실패가 통지되었습니다.',
        ]);
        $this->markSubscriptionPastDue($payment->subscription);
    }

    private function markSubscriptionPastDue(Subscription $subscription): void
    {
        if ($subscription->status === SubscriptionStatus::Canceled) {
            return;
        }

        Subscription::query()->whereKey($subscription->id)->update([
            'status' => SubscriptionStatus::PastDue,
            'version' => DB::raw('version + 1'),
        ]);
    }
}
