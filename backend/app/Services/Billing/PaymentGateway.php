<?php

declare(strict_types=1);

namespace App\Services\Billing;

interface PaymentGateway
{
    /**
     * 카드 등록(자동결제 인증) 완료 후 받은 authKey를 실제 빌링키로 교환한다.
     * 응답의 customerKey가 요청자와 일치하는지 호출부에서 반드시 확인한다.
     */
    public function issueBillingKey(string $authKey, string $customerKey): BillingKeyIssueResult;

    public function chargeBillingKey(
        string $billingKey,
        string $customerKey,
        string $orderId,
        int $amount,
        string $orderName,
    ): PaymentChargeResult;

    /**
     * @param  array<string, string>  $headers  소문자 헤더 이름을 키로 하는 웹훅 요청 헤더
     */
    public function verifyWebhookSignature(string $payload, array $headers): bool;
}
