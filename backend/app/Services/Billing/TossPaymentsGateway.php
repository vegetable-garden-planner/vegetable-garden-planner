<?php

declare(strict_types=1);

namespace App\Services\Billing;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class TossPaymentsGateway implements PaymentGateway
{
    public function issueBillingKey(string $authKey, string $customerKey): BillingKeyIssueResult
    {
        try {
            $response = $this->client()->post("{$this->baseUrl()}/v1/billing/authorizations/issue", [
                'authKey' => $authKey,
                'customerKey' => $customerKey,
            ]);
        } catch (ConnectionException $exception) {
            return BillingKeyIssueResult::failure('카드 등록 서버에 연결하지 못했습니다: '.$exception->getMessage());
        }

        if ($response->failed()) {
            $message = (string) ($response->json('message') ?? '카드 등록에 실패했습니다.');

            return BillingKeyIssueResult::failure($message);
        }

        $billingKey = $response->json('billingKey');
        $returnedCustomerKey = $response->json('customerKey');
        if (! is_string($billingKey) || $billingKey === '' || ! is_string($returnedCustomerKey) || $returnedCustomerKey === '') {
            return BillingKeyIssueResult::failure('카드 등록 응답을 확인할 수 없습니다.');
        }

        return BillingKeyIssueResult::success($billingKey, $returnedCustomerKey);
    }

    public function chargeBillingKey(
        string $billingKey,
        string $customerKey,
        string $orderId,
        int $amount,
        string $orderName,
    ): PaymentChargeResult {
        try {
            $response = $this->client()->post("{$this->baseUrl()}/v1/billing/{$billingKey}", [
                'customerKey' => $customerKey,
                'orderId' => $orderId,
                'orderName' => $orderName,
                'amount' => $amount,
                'currency' => 'KRW',
            ]);
        } catch (ConnectionException $exception) {
            return PaymentChargeResult::failure('결제 서버에 연결하지 못했습니다: '.$exception->getMessage());
        }

        if ($response->failed()) {
            $message = (string) ($response->json('message') ?? '결제 요청이 거절되었습니다.');

            return PaymentChargeResult::failure($message);
        }

        $status = (string) $response->json('status', '');
        if ($status !== 'DONE') {
            $message = (string) ($response->json('message') ?? "결제가 완료되지 않았습니다(status: {$status}).");

            return PaymentChargeResult::failure($message);
        }

        return PaymentChargeResult::success();
    }

    /**
     * @param  array<string, string>  $headers
     */
    public function verifyWebhookSignature(string $payload, array $headers): bool
    {
        $transmissionTime = $headers['tosspayments-webhook-transmission-time'] ?? null;
        $signatureHeader = $headers['tosspayments-webhook-signature'] ?? null;
        $securityKeyHex = (string) config('services.toss_payments.webhook_security_key');

        if ($transmissionTime === null || $signatureHeader === null || $securityKeyHex === '') {
            return false;
        }

        $keyBytes = hex2bin($securityKeyHex);
        if ($keyBytes === false) {
            return false;
        }

        $expected = hash_hmac('sha256', "{$payload}:{$transmissionTime}", $keyBytes, true);

        foreach (explode(',', $signatureHeader) as $candidate) {
            [$version, $signature] = array_pad(explode(':', trim($candidate), 2), 2, null);
            if ($version !== 'v1' || ! is_string($signature)) {
                continue;
            }

            $candidateBytes = base64_decode($signature, true);
            if ($candidateBytes !== false && hash_equals($expected, $candidateBytes)) {
                return true;
            }
        }

        return false;
    }

    private function client(): PendingRequest
    {
        $secretKey = (string) config('services.toss_payments.secret_key');
        if ($secretKey === '') {
            throw new RuntimeException('TOSS_PAYMENTS_SECRET_KEY가 설정되지 않았습니다.');
        }

        return Http::acceptJson()
            ->withBasicAuth($secretKey, '')
            ->timeout(10)
            ->retry(2, 150, throw: false);
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.toss_payments.base_url', 'https://api.tosspayments.com'), '/');
    }
}
