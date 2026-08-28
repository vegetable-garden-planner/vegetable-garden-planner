<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\CultivationTaskStatus;
use App\Enums\UserStatus;
use App\Mail\DailyReminderMail;
use App\Models\CultivationTask;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\PushSubscription;
use App\Models\User;
use App\Models\WateringSchedule;
use App\Services\Notifications\PushNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Tests\Fakes\FakePushNotifier;
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

    public function test_it_sends_a_push_notification_to_subscribed_owners_and_prunes_expired_subscriptions(): void
    {
        Mail::fake();
        $fakePush = new FakePushNotifier;
        $this->app->instance(PushNotifier::class, $fakePush);

        $dueUser = User::factory()->create();
        $dueSpace = GrowingSpace::factory()->for($dueUser, 'owner')->create();
        $dueSeason = GrowingSeason::factory()->for($dueSpace)->create();
        CultivationTask::factory()->for($dueSeason)->create([
            'due_date' => now()->toDateString(),
            'status' => CultivationTaskStatus::Pending,
        ]);
        $liveSubscription = PushSubscription::factory()->for($dueUser)->create();
        $expiredSubscription = PushSubscription::factory()->for($dueUser)->create();
        $fakePush->expiredEndpoints = [$expiredSubscription->endpoint];

        $unsubscribedUser = User::factory()->create();
        $unsubscribedSpace = GrowingSpace::factory()->for($unsubscribedUser, 'owner')->create();
        $unsubscribedSeason = GrowingSeason::factory()->for($unsubscribedSpace)->create();
        CultivationTask::factory()->for($unsubscribedSeason)->create([
            'due_date' => now()->toDateString(),
            'status' => CultivationTaskStatus::Pending,
        ]);

        Artisan::call('notifications:send-daily-reminders');

        $this->assertCount(2, $fakePush->sent);
        $this->assertDatabaseHas('push_subscriptions', ['id' => $liveSubscription->id]);
        $this->assertDatabaseMissing('push_subscriptions', ['id' => $expiredSubscription->id]);
    }
}
