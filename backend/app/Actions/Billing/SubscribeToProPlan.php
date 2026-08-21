<?php

declare(strict_types=1);

namespace App\Actions\Billing;

use App\Enums\SubscriptionPaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Exceptions\ApiConflictException;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Services\Billing\PaymentGateway;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class SubscribeToProPlan
{
    private const MONTHLY_PRICE = 4_900;

    private const ORDER_NAME = '심어봄 프로 요금제';

    public function __construct(private readonly PaymentGateway $gateway) {}

    public function execute(User $user, string $billingKey): Subscription
    {
        $existing = Subscription::query()->where('user_id', $user->id)->first();
        if ($existing !== null && in_array($existing->status, [SubscriptionStatus::Active, SubscriptionStatus::PastDue], true)) {
            throw new ApiConflictException('SUBSCRIPTION_ALREADY_ACTIVE', '이미 진행 중인 구독이 있습니다.');
        }

        $ownerId = $this->gateway->findBillingKeyOwnerId($billingKey);
        if ($ownerId !== $user->id) {
            throw ValidationException::withMessages([
                'billing_key' => '본인 명의로 등록한 카드만 사용할 수 있습니다.',
            ]);
        }

        $paymentId = (string) Str::uuid();
        $result = $this->gateway->chargeBillingKey(
            $billingKey,
            $paymentId,
            self::MONTHLY_PRICE,
            self::ORDER_NAME,
            $user->id,
        );

        if (! $result->success) {
            throw ValidationException::withMessages([
                'billing_key' => $result->failureReason ?? '결제에 실패했습니다.',
            ]);
        }

        $subscription = Subscription::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan_code' => 'pro',
                'status' => SubscriptionStatus::Active,
                'portone_billing_key' => $billingKey,
                'current_period_start' => now(),
                'current_period_end' => now()->addMonth(),
                'canceled_at' => null,
                'version' => ($existing?->version ?? 0) + 1,
            ],
        );

        SubscriptionPayment::query()->create([
            'subscription_id' => $subscription->id,
            'portone_payment_id' => $paymentId,
            'status' => SubscriptionPaymentStatus::Paid,
            'amount' => self::MONTHLY_PRICE,
            'currency' => 'KRW',
            'paid_at' => now(),
        ]);

        return $subscription;
    }
}
