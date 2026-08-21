<?php

declare(strict_types=1);

namespace App\Actions\Notifications;

use App\Models\PushSubscription;
use App\Models\User;

final class SavePushSubscription
{
    /** @param array{p256dh: string, auth: string} $keys */
    public function execute(User $user, string $endpoint, array $keys): PushSubscription
    {
        return PushSubscription::query()->updateOrCreate(
            ['user_id' => $user->id, 'endpoint' => $endpoint],
            ['p256dh_key' => $keys['p256dh'], 'auth_token' => $keys['auth']],
        );
    }
}
