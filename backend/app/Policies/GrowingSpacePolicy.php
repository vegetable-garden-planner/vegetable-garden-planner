<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\GrowingSpace;
use App\Models\User;

class GrowingSpacePolicy
{
    public function view(User $user, GrowingSpace $growingSpace): bool
    {
        return $growingSpace->owner_id === $user->id;
    }

    public function update(User $user, GrowingSpace $growingSpace): bool
    {
        return $this->view($user, $growingSpace);
    }

    public function delete(User $user, GrowingSpace $growingSpace): bool
    {
        return $this->view($user, $growingSpace);
    }
}
