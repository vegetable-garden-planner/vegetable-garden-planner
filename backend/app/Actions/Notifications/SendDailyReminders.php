<?php

declare(strict_types=1);

namespace App\Actions\Notifications;

use App\Enums\CultivationTaskStatus;
use App\Enums\UserStatus;
use App\Mail\DailyReminderMail;
use App\Models\CultivationTask;
use App\Models\User;
use App\Models\WateringSchedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

final class SendDailyReminders
{
    public function execute(): int
    {
        $today = Carbon::today();

        $tasksByOwner = CultivationTask::query()
            ->where('status', CultivationTaskStatus::Pending)
            ->whereDate('due_date', '<=', $today)
            ->with(['growingSeason.growingSpace'])
            ->get()
            ->groupBy(fn (CultivationTask $task): string => $task->growingSeason->growingSpace->owner_id);

        $schedulesByOwner = WateringSchedule::query()
            ->where('enabled', true)
            ->whereDate('next_watering_at', '<=', $today)
            ->with(['growingSeason.growingSpace', 'crop'])
            ->get()
            ->groupBy(fn (WateringSchedule $schedule): string => $schedule->growingSeason->growingSpace->owner_id);

        $ownerIds = $tasksByOwner->keys()->merge($schedulesByOwner->keys())->unique();

        $activeOwners = User::query()
            ->whereIn('id', $ownerIds)
            ->where('status', UserStatus::Active)
            ->get()
            ->keyBy('id');

        $sent = 0;

        foreach ($ownerIds as $ownerId) {
            $user = $activeOwners->get($ownerId);
            if (! $user) {
                continue;
            }

            Mail::to($user)->queue(new DailyReminderMail(
                $user,
                $tasksByOwner->get($ownerId) ?? collect(),
                $schedulesByOwner->get($ownerId) ?? collect(),
            ));
            $sent++;
        }

        return $sent;
    }
}
