<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Models\PushSubscription;
use App\Services\Notifications\PushNotifier;

final class FakePushNotifier implements PushNotifier
{
    /** @var list<array{subscription: PushSubscription, title: string, body: string, url: string}> */
    public array $sent = [];

    /** @var list<string> 만료된 것으로 응답할 구독 endpoint 목록 */
    public array $expiredEndpoints = [];

    public function send(PushSubscription $subscription, string $title, string $body, string $url): bool
    {
        $this->sent[] = compact('subscription', 'title', 'body', 'url');

        return ! in_array($subscription->endpoint, $this->expiredEndpoints, true);
    }
}
