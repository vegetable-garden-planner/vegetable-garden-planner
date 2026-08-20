<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\CultivationTaskStatus;
use App\Enums\UserStatus;
use App\Mail\DailyReminderMail;
use App\Models\CultivationTask;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;
use App\Models\WateringSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SendDailyRemindersTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_mails_owners_with_a_due_task_or_watering(): void
    {
        Mail::fake();

        $dueUser = User::factory()->create();
        $dueSpace = GrowingSpace::factory()->for($dueUser, 'owner')->create();
        $dueSeason = GrowingSeason::factory()->for($dueSpace)->create();
        CultivationTask::factory()->for($dueSeason)->create([
            'due_date' => now()->toDateString(),
            'status' => CultivationTaskStatus::Pending,
        ]);

        $wateringUser = User::factory()->create();
        $wateringSpace = GrowingSpace::factory()->for($wateringUser, 'owner')->create();
        $wateringSeason = GrowingSeason::factory()->for($wateringSpace)->create();
        WateringSchedule::factory()->for($wateringSeason)->create([
            'next_watering_at' => now()->subDay(),
            'enabled' => true,
        ]);

        $idleUser = User::factory()->create();
        $idleSpace = GrowingSpace::factory()->for($idleUser, 'owner')->create();
        $idleSeason = GrowingSeason::factory()->for($idleSpace)->create();
        CultivationTask::factory()->for($idleSeason)->create([
            'due_date' => now()->addWeek()->toDateString(),
            'status' => CultivationTaskStatus::Pending,
        ]);

        $disabledUser = User::factory()->create(['status' => UserStatus::Disabled]);
        $disabledSpace = GrowingSpace::factory()->for($disabledUser, 'owner')->create();
        $disabledSeason = GrowingSeason::factory()->for($disabledSpace)->create();
        CultivationTask::factory()->for($disabledSeason)->create([
            'due_date' => now()->toDateString(),
            'status' => CultivationTaskStatus::Pending,
        ]);

        Artisan::call('notifications:send-daily-reminders');

        Mail::assertQueued(DailyReminderMail::class, 2);
        Mail::assertQueued(
            DailyReminderMail::class,
            fn (DailyReminderMail $mail): bool => $mail->user->is($dueUser) && $mail->tasks->isNotEmpty(),
        );
        Mail::assertQueued(
            DailyReminderMail::class,
            fn (DailyReminderMail $mail): bool => $mail->user->is($wateringUser) && $mail->schedules->isNotEmpty(),
        );
        Mail::assertNotQueued(
            DailyReminderMail::class,
            fn (DailyReminderMail $mail): bool => $mail->user->is($idleUser) || $mail->user->is($disabledUser),
        );
    }
}
