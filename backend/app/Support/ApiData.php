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
            'nickname' => $user->nickname ?: $user->name,
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
            'type' => $space->type,
            'sunlight' => $space->sunlight,
            'widthCm' => $space->width_cm,
            'lengthCm' => $space->length_cm,
            'region' => $space->region,
            'notes' => $space->notes,
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
            'spaceId' => (string) $season->growing_space_id,
            'name' => $season->name,
            'startDate' => $season->start_date->toDateString(),
            'endDate' => $season->end_date->toDateString(),
            'notes' => $season->notes,
            'featuredCropId' => $season->featured_crop_id,
            'status' => $status,
            'version' => $season->version,
            'createdAt' => $season->created_at?->toISOString(),
            'updatedAt' => $season->updated_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    public static function layout(GardenLayout $layout): array
    {
        return [
            'seasonId' => (string) $layout->season_id,
            'spaceId' => (string) $layout->space_id,
            'spaceWidthCm' => $layout->space_width_cm,
            'spaceLengthCm' => $layout->space_length_cm,
            'cellSizeCm' => $layout->cell_size_cm,
            'columns' => $layout->columns,
            'rows' => $layout->rows,
            'placements' => $layout->placements,
            'version' => $layout->version,
            'updatedAt' => $layout->updated_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    public static function task(CultivationTask $task): array
    {
        return [
            'id' => (string) $task->id,
            'seasonId' => (string) $task->season_id,
            'cropId' => $task->crop_id,
            'type' => $task->type,
            'title' => $task->title,
            'dueDate' => $task->due_date->toDateString(),
            'notes' => $task->notes,
            'status' => $task->status,
            'completedAt' => $task->completed_at?->toISOString(),
            'version' => $task->version,
            'createdAt' => $task->created_at?->toISOString(),
            'updatedAt' => $task->updated_at?->toISOString(),
        ];
    }
}
