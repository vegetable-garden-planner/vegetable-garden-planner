<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\CultivationRecord;
use App\Models\User;

class CultivationRecordPolicy
{
    public function view(User $user, CultivationRecord $record): bool
    {
        return $record->growingSeason->growingSpace->owner_id === $user->id;
    }

    public function update(User $user, CultivationRecord $record): bool
    {
        return $this->view($user, $record);
    }

    public function delete(User $user, CultivationRecord $record): bool
    {
        return $this->view($user, $record);
    }
}
