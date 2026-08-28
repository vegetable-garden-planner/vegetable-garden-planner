<?php

declare(strict_types=1);

namespace App\Actions\Notifications;

use App\Models\User;

final class DeletePushSubscription
{
    public function execute(User $user, string $endpoint): void
    {
        $user->pushSubscriptions()->where('endpoint', $endpoint)->delete();
    }
}
