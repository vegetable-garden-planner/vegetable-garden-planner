<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\SpaceMemo;
use App\Models\User;

class SpaceMemoPolicy
{
    public function view(User $user, SpaceMemo $memo): bool
    {
        return $memo->growingSpace->owner_id === $user->id;
    }

    public function update(User $user, SpaceMemo $memo): bool
    {
        return $this->view($user, $memo);
    }

    public function delete(User $user, SpaceMemo $memo): bool
    {
        return $this->view($user, $memo);
    }
}
