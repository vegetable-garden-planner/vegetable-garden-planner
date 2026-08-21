<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Billing;

use App\Actions\Billing\ReconcileSubscriptionWebhookEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Billing\PortOneWebhookRequest;
use App\Services\Billing\PaymentGateway;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Response;

class PortOneWebhookController extends Controller
{
    public function __invoke(
        PortOneWebhookRequest $request,
        PaymentGateway $gateway,
        ReconcileSubscriptionWebhookEvent $action,
    ): Response {
        $headers = array_filter([
            'webhook-id' => $request->header('webhook-id'),
            'webhook-timestamp' => $request->header('webhook-timestamp'),
            'webhook-signature' => $request->header('webhook-signature'),
        ], fn (?string $value): bool => $value !== null);

        if (! $gateway->verifyWebhookSignature($request->getContent(), $headers)) {
            throw new AuthenticationException('웹훅 서명이 유효하지 않습니다.');
        }

        $action->execute(
            (string) $request->input('type'),
            (string) $request->input('data.paymentId', ''),
        );

        return response()->noContent();
    }
}
