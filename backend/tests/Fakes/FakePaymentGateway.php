<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Services\Billing\PaymentChargeResult;
use App\Services\Billing\PaymentGateway;

final class FakePaymentGateway implements PaymentGateway
{
    /** @var list<array{billingKey: string, paymentId: string, amount: int, orderName: string, customerId: string}> */
    public array $charges = [];

    /** @var list<string> 청구가 실패한 것으로 응답할 빌링키 목록 */
    public array $failingBillingKeys = [];

    public string $failureReason = '카드 승인이 거절되었습니다.';

    /** @var array<string, string> 빌링키 -> 소유자 customerId */
    public array $billingKeyOwners = [];

    public bool $verifyWebhookSignatureResult = true;

    public function chargeBillingKey(
        string $billingKey,
        string $paymentId,
        int $amount,
        string $orderName,
        string $customerId,
    ): PaymentChargeResult {
        $this->charges[] = compact('billingKey', 'paymentId', 'amount', 'orderName', 'customerId');

        if (in_array($billingKey, $this->failingBillingKeys, true)) {
            return PaymentChargeResult::failure($this->failureReason);
        }

        return PaymentChargeResult::success();
    }

    public function findBillingKeyOwnerId(string $billingKey): ?string
    {
        return $this->billingKeyOwners[$billingKey] ?? null;
    }

    /**
     * @param  array<string, string>  $headers
     */
    public function verifyWebhookSignature(string $payload, array $headers): bool
    {
        return $this->verifyWebhookSignatureResult;
    }
}
