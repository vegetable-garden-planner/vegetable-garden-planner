<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\CultivationTask;
use App\Models\User;

class CultivationTaskPolicy
{
    public function view(User $user, CultivationTask $task): bool
    {
        return $task->growingSeason->growingSpace->owner_id === $user->id;
    }

    public function update(User $user, CultivationTask $task): bool
    {
        return $this->view($user, $task);
    }

    public function delete(User $user, CultivationTask $task): bool
    {
        return $this->view($user, $task);
    }
}
