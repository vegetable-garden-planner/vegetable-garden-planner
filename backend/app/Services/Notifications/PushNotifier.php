<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\PushSubscription;

interface PushNotifier
{
    /**
     * 알림을 전송한다. 구독이 만료·취소되어 더는 유효하지 않으면 false를 반환한다.
     */
    public function send(PushSubscription $subscription, string $title, string $body, string $url): bool;
}
