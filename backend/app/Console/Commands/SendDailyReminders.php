<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Notifications\SendDailyReminders as SendDailyRemindersAction;
use Illuminate\Console\Command;

class SendDailyReminders extends Command
{
    protected $signature = 'notifications:send-daily-reminders';

    protected $description = '오늘 기한인 재배 일정과 물주기를 회원에게 메일로 안내합니다.';

    public function handle(SendDailyRemindersAction $action): int
    {
        $sent = $action->execute();
        $this->info("{$sent}명에게 알림 메일을 큐에 넣었습니다.");

        return self::SUCCESS;
    }
}
