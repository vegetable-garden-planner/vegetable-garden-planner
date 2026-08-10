<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\GrowingSeason;
use App\Models\User;

class GrowingSeasonPolicy
{
    public function view(User $user, GrowingSeason $season): bool
    {
        return $season->growingSpace->owner_id === $user->id;
    }

    public function update(User $user, GrowingSeason $season): bool
    {
        return $this->view($user, $season);
    }

    public function delete(User $user, GrowingSeason $season): bool
    {
        return $this->view($user, $season);
    }
}
