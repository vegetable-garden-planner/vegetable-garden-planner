<?php

declare(strict_types=1);

namespace App\Actions\Billing;

use App\Enums\SubscriptionPaymentStatus;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use Illuminate\Support\Facades\Log;

final class ReconcileSubscriptionWebhookEvent
{
    private const FAILED_PAYMENT_STATUSES = ['CANCELED', 'ABORTED', 'EXPIRED'];

    public function __construct(private readonly RecordFailedSubscriptionCharge $recordFailedCharge) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(string $eventType, array $data): void
    {
        match ($eventType) {
            'PAYMENT_STATUS_CHANGED' => $this->reconcilePayment($data),
            'BILLING_DELETED' => $this->reconcileBillingKeyDeletion($data),
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function reconcilePayment(array $data): void
    {
        $orderId = (string) ($data['orderId'] ?? '');
        if ($orderId === '') {
            return;
        }

        $payment = SubscriptionPayment::query()->where('order_id', $orderId)->first();
        if ($payment === null) {
            Log::info('알 수 없는 결제 웹훅을 수신했습니다.', ['orderId' => $orderId]);

            return;
        }

        $status = (string) ($data['status'] ?? '');
        if ($status === 'DONE') {
            $this->markPaid($payment);
        } elseif (in_array($status, self::FAILED_PAYMENT_STATUSES, true)) {
            $this->markFailed($payment);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function reconcileBillingKeyDeletion(array $data): void
    {
        $customerKey = (string) ($data['customerKey'] ?? '');
        if ($customerKey === '') {
            return;
        }

        $subscription = Subscription::query()->where('user_id', $customerKey)->first();
        if ($subscription === null) {
            return;
        }

        $this->recordFailedCharge->execute($subscription);
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
        $this->recordFailedCharge->execute($payment->subscription);
    }
}
