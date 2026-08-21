<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Services\Billing\BillingKeyIssueResult;
use App\Services\Billing\PaymentChargeResult;
use App\Services\Billing\PaymentGateway;

final class FakePaymentGateway implements PaymentGateway
{
    /** @var list<array{authKey: string, customerKey: string}> */
    public array $issuances = [];

    /** @var list<array{billingKey: string, customerKey: string, orderId: string, amount: int, orderName: string}> */
    public array $charges = [];

    /** @var array<string, string> authKey -> 발급될 billingKey */
    public array $billingKeysByAuthKey = [];

    /** @var array<string, string> authKey -> 응답으로 돌아올 customerKey (기본은 요청자의 customerKey와 동일) */
    public array $issuedCustomerKeyOverrides = [];

    /** @var list<string> 발급이 실패한 것으로 응답할 authKey 목록 */
    public array $failingAuthKeys = [];

    /** @var list<string> 청구가 실패한 것으로 응답할 빌링키 목록 */
    public array $failingBillingKeys = [];

    public string $failureReason = '카드 승인이 거절되었습니다.';

    public bool $verifyWebhookSignatureResult = true;

    public function issueBillingKey(string $authKey, string $customerKey): BillingKeyIssueResult
    {
        $this->issuances[] = compact('authKey', 'customerKey');

        if (in_array($authKey, $this->failingAuthKeys, true)) {
            return BillingKeyIssueResult::failure($this->failureReason);
        }

        $billingKey = $this->billingKeysByAuthKey[$authKey] ?? 'billing-key-for-'.$authKey;
        $returnedCustomerKey = $this->issuedCustomerKeyOverrides[$authKey] ?? $customerKey;

        return BillingKeyIssueResult::success($billingKey, $returnedCustomerKey);
    }

    public function chargeBillingKey(
        string $billingKey,
        string $customerKey,
        string $orderId,
        int $amount,
        string $orderName,
    ): PaymentChargeResult {
        $this->charges[] = compact('billingKey', 'customerKey', 'orderId', 'amount', 'orderName');

        if (in_array($billingKey, $this->failingBillingKeys, true)) {
            return PaymentChargeResult::failure($this->failureReason);
        }

        return PaymentChargeResult::success();
    }

    /**
     * @param  array<string, string>  $headers
     */
    public function verifyWebhookSignature(string $payload, array $headers): bool
    {
        return $this->verifyWebhookSignatureResult;
    }
}
