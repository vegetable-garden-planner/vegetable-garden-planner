<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\PushSubscription;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

final class WebPushNotifier implements PushNotifier
{
    public function send(PushSubscription $subscription, string $title, string $body, string $url): bool
    {
        $webPush = new WebPush([
            'VAPID' => [
                'subject' => (string) config('services.web_push.subject'),
                'publicKey' => (string) config('services.web_push.public_key'),
                'privateKey' => (string) config('services.web_push.private_key'),
            ],
        ]);

        $report = $webPush->sendOneNotification(
            Subscription::create([
                'endpoint' => $subscription->endpoint,
                'publicKey' => $subscription->p256dh_key,
                'authToken' => $subscription->auth_token,
            ]),
            json_encode(['title' => $title, 'body' => $body, 'url' => $url], JSON_THROW_ON_ERROR),
        );

        return ! $report->isSubscriptionExpired();
    }
}
