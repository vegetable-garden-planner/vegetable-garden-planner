<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Enums\CultivationTaskStatus;
use App\Enums\UserStatus;
use App\Models\Crop;
use App\Models\CropSource;
use App\Models\CultivationRecord;
use App\Models\CultivationTask;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\WateringSchedule;
use Illuminate\Support\Facades\DB;

final class AdminDashboardService
{
    /** @return array<string, mixed> */
    public function summary(): array
    {
        $today = today();
        $weekAgo = now()->subDays(7);

        return [
            'metrics' => [
                'users' => User::query()->count(),
                'newUsers' => User::query()->where('created_at', '>=', $weekAgo)->count(),
                'spaces' => GrowingSpace::query()->count(),
                'activeSeasons' => GrowingSeason::query()
                    ->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)
                    ->count(),
                'pendingTasks' => CultivationTask::query()
                    ->where('status', CultivationTaskStatus::Pending->value)
                    ->count(),
                'recentRecords' => CultivationRecord::query()->where('created_at', '>=', $weekAgo)->count(),
            ],
            'operations' => [
                'layouts' => GardenLayout::query()->count(),
                'wateringSchedules' => WateringSchedule::query()->count(),
                'socialAccounts' => SocialAccount::query()->count(),
                'crops' => Crop::query()->count(),
                'sources' => CropSource::query()->count(),
            ],
            'alerts' => [
                'disabledUsers' => User::query()->where('status', UserStatus::Disabled->value)->count(),
                'overdueTasks' => CultivationTask::query()
                    ->where('status', CultivationTaskStatus::Pending->value)
                    ->whereDate('due_date', '<', $today)
                    ->count(),
                'spacesWithoutLocation' => GrowingSpace::query()->whereNull('latitude')->count(),
                'activeSeasonsWithoutTasks' => GrowingSeason::query()
                    ->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)
                    ->whereDoesntHave('tasks')
                    ->count(),
                'failedJobs' => DB::table('failed_jobs')->count(),
            ],
            'recentUsers' => User::query()
                ->withCount(['growingSpaces', 'socialAccounts'])
                ->latest()
                ->limit(6)
                ->get(),
            'recentRecords' => CultivationRecord::query()
                ->with('growingSeason.growingSpace.owner')
                ->latest()
                ->limit(6)
                ->get(),
        ];
    }
}
