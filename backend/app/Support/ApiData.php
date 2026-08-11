<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\CultivationTask;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Models\User;

final class ApiData
{
    /** @return array<string, mixed> */
    public static function user(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'email' => $user->email,
            'nickname' => $user->nickname ?: '새싹',
            'role' => $user->role ?: 'member',
            'createdAt' => $user->created_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    public static function space(GrowingSpace $space): array
    {
        return [
            'id' => (string) $space->id,
            'name' => $space->name,
            'type' => $space->space_type,
            'sunlight' => $space->sunlight,
            'widthCm' => (int) $space->width,
            'lengthCm' => (int) $space->height,
            'region' => $space->region?->name ?? '',
            'notes' => $space->notes ?? '',
            'version' => $space->version,
            'createdAt' => $space->created_at?->toISOString(),
            'updatedAt' => $space->updated_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    public static function season(GrowingSeason $season): array
    {
        $today = now()->toDateString();
        $status = $today < $season->start_date->toDateString()
            ? 'planned'
            : ($today > $season->end_date->toDateString() ? 'completed' : 'active');

        return [
            'id' => (string) $season->id,
            'spaceId' => (string) $season->garden_id,
            'name' => $season->name,
            'startDate' => $season->start_date->toDateString(),
            'endDate' => $season->end_date->toDateString(),
            'notes' => $season->notes ?? '',
            'featuredCropId' => $season->featured_crop_slug,
            'status' => $status,
            'version' => $season->version,
            'createdAt' => $season->created_at?->toISOString(),
            'updatedAt' => $season->updated_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    public static function layout(GardenLayout $layout): array
    {
        $data = $layout->layout_data;

        return [
            'seasonId' => (string) $layout->season_id,
            'spaceId' => (string) $data['spaceId'],
            'spaceWidthCm' => $data['spaceWidthCm'],
            'spaceLengthCm' => $data['spaceLengthCm'],
            'cellSizeCm' => $data['cellSizeCm'],
            'columns' => $data['columns'],
            'rows' => $data['rows'],
            'placements' => $data['placements'],
            'version' => $layout->version,
            'updatedAt' => $layout->updated_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    public static function task(CultivationTask $task): array
    {
        $task->loadMissing(['taskType', 'planting.crop', 'completions']);
        $completion = $task->completions->sortByDesc('completed_at')->first();

        return [
            'id' => (string) $task->id,
            'seasonId' => (string) $task->season_id,
            'cropId' => $task->planting?->crop?->slug,
            'type' => $task->taskType?->name ?? 'other',
            'title' => $task->title,
            'dueDate' => $task->due_date->toDateString(),
            'notes' => $task->notes ?? '',
            'status' => $task->status,
            'completedAt' => $completion?->completed_at?->toISOString(),
            'version' => $task->version,
            'createdAt' => $task->created_at?->toISOString(),
            'updatedAt' => $task->updated_at?->toISOString(),
        ];
    }
}
