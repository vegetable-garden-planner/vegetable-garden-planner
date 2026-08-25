<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\WateringSchedule;

class WateringSchedulePolicy
{
    public function view(User $user, WateringSchedule $schedule): bool
    {
        return $schedule->growingSeason->growingSpace->owner_id === $user->id;
    }

    public function update(User $user, WateringSchedule $schedule): bool
    {
        return $this->view($user, $schedule);
    }

    public function delete(User $user, WateringSchedule $schedule): bool
    {
        return $this->view($user, $schedule);
    }
}
