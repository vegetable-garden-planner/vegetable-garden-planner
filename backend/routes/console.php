<?php

use App\Console\Commands\ChargeDueSubscriptions;
use App\Console\Commands\SendDailyReminders;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command(SendDailyReminders::class)->dailyAt('07:00');
Schedule::command(ChargeDueSubscriptions::class)->dailyAt('07:30');
Schedule::command('queue:work --stop-when-empty')->everyMinute()->withoutOverlapping();
