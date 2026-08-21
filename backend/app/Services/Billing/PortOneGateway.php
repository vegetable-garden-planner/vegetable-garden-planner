<?php

declare(strict_types=1);

namespace App\Services\Billing;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class PortOneGateway implements PaymentGateway
{
    public function chargeBillingKey(
        string $billingKey,
        string $paymentId,
        int $amount,
        string $orderName,
        string $customerId,
    ): PaymentChargeResult {
        try {
            $response = $this->client()
                ->post("{$this->baseUrl()}/payments/{$paymentId}/billing-key", [
                    'payment' => [
                        'billingKey' => $billingKey,
                        'orderName' => $orderName,
                        'customer' => ['id' => $customerId],
                        'amount' => ['total' => $amount],
                        'currency' => 'KRW',
                    ],
                ]);
        } catch (ConnectionException $exception) {
            return PaymentChargeResult::failure('결제 서버에 연결하지 못했습니다: '.$exception->getMessage());
        }

        if ($response->failed()) {
            $message = (string) ($response->json('message') ?? '결제 요청이 거절되었습니다.');

            return PaymentChargeResult::failure($message);
        }

        $status = (string) $response->json('status', '');
        if (! in_array($status, ['PAID', 'VIRTUAL_ACCOUNT_ISSUED'], true)) {
            $message = (string) ($response->json('message') ?? "결제가 완료되지 않았습니다(status: {$status}).");

            return PaymentChargeResult::failure($message);
        }

        return PaymentChargeResult::success();
    }

    public function findBillingKeyOwnerId(string $billingKey): ?string
    {
        try {
            $response = $this->client()->get("{$this->baseUrl()}/billing-keys/{$billingKey}");
        } catch (ConnectionException) {
            return null;
        }

        if ($response->failed()) {
            return null;
        }

        $ownerId = $response->json('billingKeyInfo.customer.id') ?? $response->json('customer.id');

        return is_string($ownerId) && $ownerId !== '' ? $ownerId : null;
    }

    /**
     * @param  array<string, string>  $headers
     */
    public function verifyWebhookSignature(string $payload, array $headers): bool
    {
        $id = $headers['webhook-id'] ?? null;
        $timestamp = $headers['webhook-timestamp'] ?? null;
        $signatureHeader = $headers['webhook-signature'] ?? null;
        $secret = (string) config('services.portone.webhook_secret');

        if ($id === null || $timestamp === null || $signatureHeader === null || $secret === '') {
            return false;
        }

        $secretBytes = base64_decode(
            str_starts_with($secret, 'whsec_') ? substr($secret, 6) : $secret,
            true,
        );
        if ($secretBytes === false) {
            return false;
        }

        $expected = base64_encode(hash_hmac('sha256', "{$id}.{$timestamp}.{$payload}", $secretBytes, true));

        foreach (explode(' ', $signatureHeader) as $candidate) {
            [$version, $signature] = array_pad(explode(',', $candidate, 2), 2, null);
            if ($version === 'v1' && is_string($signature) && hash_equals($expected, $signature)) {
                return true;
            }
        }

        return false;
    }

    private function client(): PendingRequest
    {
        $apiSecret = (string) config('services.portone.api_secret');
        if ($apiSecret === '') {
            throw new RuntimeException('PORTONE_API_SECRET이 설정되지 않았습니다.');
        }

        return Http::acceptJson()
            ->withHeaders(['Authorization' => "PortOne {$apiSecret}"])
            ->timeout(10)
            ->retry(2, 150, throw: false);
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.portone.base_url', 'https://api.portone.io'), '/');
    }
}
