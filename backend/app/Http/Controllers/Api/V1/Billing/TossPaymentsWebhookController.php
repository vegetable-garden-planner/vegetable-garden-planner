<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Billing;

use App\Actions\Billing\ReconcileSubscriptionWebhookEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Billing\TossPaymentsWebhookRequest;
use App\Services\Billing\PaymentGateway;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Response;

class TossPaymentsWebhookController extends Controller
{
    public function __invoke(
        TossPaymentsWebhookRequest $request,
        PaymentGateway $gateway,
        ReconcileSubscriptionWebhookEvent $action,
    ): Response {
        $headers = array_filter([
            'tosspayments-webhook-transmission-time' => $request->header('tosspayments-webhook-transmission-time'),
            'tosspayments-webhook-signature' => $request->header('tosspayments-webhook-signature'),
        ], fn (?string $value): bool => $value !== null);

        if (! $gateway->verifyWebhookSignature($request->getContent(), $headers)) {
            throw new AuthenticationException('웹훅 서명이 유효하지 않습니다.');
        }

        $data = $request->input('data', []);
        $action->execute(
            (string) $request->input('eventType'),
            is_array($data) ? $data : [],
        );

        return response()->noContent();
    }
}
