<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\CultivationTask;
use App\Models\User;
use App\Models\WateringSchedule;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class DailyReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  Collection<int, CultivationTask>  $tasks
     * @param  Collection<int, WateringSchedule>  $schedules
     */
    public function __construct(
        public readonly User $user,
        public readonly Collection $tasks,
        public readonly Collection $schedules,
    ) {}

    public function build(): self
    {
        return $this->subject('오늘 심어봄에서 확인할 일이 있어요')
            ->view('emails.daily-reminder', [
                'user' => $this->user,
                'tasks' => $this->tasks,
                'schedules' => $this->schedules,
                'appUrl' => rtrim(config('services.frontend.url'), '/').'/dashboard',
            ]);
    }
}
