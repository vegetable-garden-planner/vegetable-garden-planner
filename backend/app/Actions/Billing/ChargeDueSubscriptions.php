<?php

declare(strict_types=1);

namespace App\Actions\Billing;

use App\Enums\SubscriptionPaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Services\Billing\PaymentGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ChargeDueSubscriptions
{
    private const MONTHLY_PRICE = 4_900;

    private const ORDER_NAME = '심어봄 프로 요금제';

    public function __construct(private readonly PaymentGateway $gateway) {}

    public function execute(): int
    {
        $dueSubscriptions = Subscription::query()
            ->where('status', SubscriptionStatus::Active)
            ->where('current_period_end', '<=', now())
            ->get();

        foreach ($dueSubscriptions as $subscription) {
            $this->charge($subscription);
        }

        return $dueSubscriptions->count();
    }

    private function charge(Subscription $subscription): void
    {
        $orderId = (string) Str::uuid();
        $result = $this->gateway->chargeBillingKey(
            $subscription->billing_key,
            $subscription->user_id,
            $orderId,
            self::MONTHLY_PRICE,
            self::ORDER_NAME,
        );

        if ($result->success) {
            $subscription->update([
                'current_period_end' => $subscription->current_period_end->addMonth(),
                'version' => DB::raw('version + 1'),
            ]);
        } else {
            $subscription->update([
                'status' => SubscriptionStatus::PastDue,
                'version' => DB::raw('version + 1'),
            ]);
        }

        SubscriptionPayment::query()->create([
            'subscription_id' => $subscription->id,
            'order_id' => $orderId,
            'status' => $result->success ? SubscriptionPaymentStatus::Paid : SubscriptionPaymentStatus::Failed,
            'amount' => self::MONTHLY_PRICE,
            'currency' => 'KRW',
            'failure_reason' => $result->failureReason,
            'paid_at' => $result->success ? now() : null,
        ]);
    }
}
