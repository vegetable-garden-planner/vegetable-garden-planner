<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Subscription;
use App\Models\User;

class SubscriptionPolicy
{
    public function delete(User $user, Subscription $subscription): bool
    {
        return $subscription->user_id === $user->id;
    }
}
