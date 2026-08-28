<?php

declare(strict_types=1);

namespace App\Actions\Notifications;

use App\Enums\CultivationTaskStatus;
use App\Enums\UserStatus;
use App\Mail\DailyReminderMail;
use App\Models\CultivationTask;
use App\Models\User;
use App\Models\WateringSchedule;
use App\Services\Notifications\PushNotifier;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;

final class SendDailyReminders
{
    public function __construct(private readonly PushNotifier $pushNotifier) {}

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
            ->with('pushSubscriptions')
            ->get()
            ->keyBy('id');

        $sent = 0;

        foreach ($ownerIds as $ownerId) {
            $user = $activeOwners->get($ownerId);
            if (! $user) {
                continue;
            }

            $tasks = $tasksByOwner->get($ownerId) ?? collect();
            $schedules = $schedulesByOwner->get($ownerId) ?? collect();

            Mail::to($user)->queue(new DailyReminderMail($user, $tasks, $schedules));
            $this->sendPush($user, $tasks, $schedules);
            $sent++;
        }

        return $sent;
    }

    private function sendPush(User $user, Collection $tasks, Collection $schedules): void
    {
        if ($tasks->isEmpty() && $schedules->isEmpty()) {
            return;
        }

        $body = "재배 일정 {$tasks->count()}건, 물주기 {$schedules->count()}건이 오늘 기한이에요.";

        foreach ($user->pushSubscriptions as $subscription) {
            $stillValid = $this->pushNotifier->send($subscription, '오늘의 재배 알림', $body, '/dashboard');
            if (! $stillValid) {
                $subscription->delete();
            }
        }
    }
}
