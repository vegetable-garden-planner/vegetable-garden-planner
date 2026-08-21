<?php

declare(strict_types=1);

namespace App\Services\Billing;

interface PaymentGateway
{
    public function chargeBillingKey(
        string $billingKey,
        string $paymentId,
        int $amount,
        string $orderName,
        string $customerId,
    ): PaymentChargeResult;

    /**
     * 빌링키를 발급받을 때 지정했던 고객 ID(customer.id)를 조회한다.
     * 조회에 실패하거나 빌링키가 존재하지 않으면 null을 반환한다.
     */
    public function findBillingKeyOwnerId(string $billingKey): ?string;

    /**
     * @param  array<string, string>  $headers  소문자 헤더 이름을 키로 하는 웹훅 요청 헤더
     */
    public function verifyWebhookSignature(string $payload, array $headers): bool;
}
