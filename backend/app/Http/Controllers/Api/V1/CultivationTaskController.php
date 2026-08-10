<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CultivationTask;
use App\Models\GrowingSeason;
use App\Support\ApiData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CultivationTaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tasks = CultivationTask::query()
            ->whereHas('season.space', fn ($query) => $query->where('user_id', $request->user()->id))
            ->orderBy('due_date')
            ->orderBy('title')
            ->get()
            ->map(fn (CultivationTask $task): array => ApiData::task($task));

        return response()->json(['data' => $tasks]);
    }

    public function forSeason(Request $request, GrowingSeason $season): JsonResponse
    {
        $this->authorizeSeason($request, $season);
        $tasks = $season->tasks()->orderBy('due_date')->orderBy('title')->get()
            ->map(fn (CultivationTask $task): array => ApiData::task($task));

        return response()->json(['data' => $tasks]);
    }

    public function replace(Request $request, GrowingSeason $season): JsonResponse
    {
        $this->authorizeSeason($request, $season);
        $data = $request->validate([
            'tasks' => ['present', 'array', 'max:500'],
            'tasks.*.cropId' => ['nullable', 'string', 'max:100', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'tasks.*.type' => ['required', 'in:watering,sowing,transplanting,fertilizing,support,harvest,other'],
            'tasks.*.title' => ['required', 'string', 'max:100'],
            'tasks.*.dueDate' => ['required', 'date_format:Y-m-d'],
            'tasks.*.notes' => ['present', 'nullable', 'string', 'max:1000'],
            'tasks.*.status' => ['sometimes', 'in:pending,completed'],
        ]);

        $tasks = DB::transaction(function () use ($season, $data) {
            $season->tasks()->delete();
            foreach ($data['tasks'] as $item) {
                $status = $item['status'] ?? 'pending';
                $task = new CultivationTask([
                    'crop_id' => $item['cropId'] ?? null,
                    'type' => $item['type'],
                    'title' => $item['title'],
                    'due_date' => $item['dueDate'],
                    'notes' => $item['notes'] ?? '',
                    'status' => $status,
                    'completed_at' => $status === 'completed' ? now() : null,
                ]);
                $task->season_id = $season->id;
                $task->save();
            }

            return $season->tasks()->orderBy('due_date')->orderBy('title')->get();
        });

        return response()->json([
            'data' => $tasks->map(fn (CultivationTask $task): array => ApiData::task($task)),
        ], 201);
    }

    public function update(Request $request, CultivationTask $task): JsonResponse
    {
        $this->authorizeTask($request, $task);
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:100'],
            'dueDate' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'notes' => ['sometimes', 'present', 'nullable', 'string', 'max:1000'],
            'status' => ['sometimes', 'required', 'in:pending,completed'],
        ]);

        if (array_key_exists('dueDate', $data)) {
            $data['due_date'] = $data['dueDate'];
            unset($data['dueDate']);
        }
        if (array_key_exists('status', $data)) {
            $data['completed_at'] = $data['status'] === 'completed' ? now() : null;
        }
        if (array_key_exists('notes', $data) && $data['notes'] === null) {
            $data['notes'] = '';
        }
        $task->fill($data);
        $task->version++;
        $task->save();

        return response()
            ->json(['data' => ApiData::task($task)])
            ->header('ETag', '"'.$task->version.'"');
    }

    public function destroy(Request $request, CultivationTask $task): JsonResponse
    {
        $this->authorizeTask($request, $task);
        $task->delete();

        return response()->json(status: 204);
    }

    private function authorizeSeason(Request $request, GrowingSeason $season): void
    {
        $season->loadMissing('space');
        abort_unless((string) $season->space->user_id === (string) $request->user()->id, 403);
    }

    private function authorizeTask(Request $request, CultivationTask $task): void
    {
        $task->loadMissing('season.space');
        abort_unless((string) $task->season->space->user_id === (string) $request->user()->id, 403);
    }
}
