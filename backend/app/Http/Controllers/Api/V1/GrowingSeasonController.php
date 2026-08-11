<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use App\Support\ApiData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GrowingSeasonController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = GrowingSeason::query()
            ->whereHas('space', fn ($query) => $query->where('owner_id', $request->user()->id));

        if ($request->filled('spaceId')) {
            $query->where('garden_id', $request->integer('spaceId'));
        }

        $seasons = $query->latest('start_date')->get()
            ->map(fn (GrowingSeason $season): array => ApiData::season($season));

        return response()->json(['data' => $seasons]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateInput($request);
        $space = $this->ownedSpace($request, $data['spaceId']);
        if ($this->overlaps($space, $data['startDate'], $data['endDate'])) {
            return $this->overlapResponse();
        }

        $season = new GrowingSeason($this->attributes($data));
        $season->garden_id = $space->id;
        $season->status = $this->statusFor($data['startDate'], $data['endDate']);
        $season->save();

        return response()
            ->json(['data' => ApiData::season($season)], 201)
            ->header('ETag', '"'.$season->version.'"');
    }

    public function show(Request $request, GrowingSeason $season): JsonResponse
    {
        $this->authorizeOwner($request, $season);

        return response()
            ->json(['data' => ApiData::season($season)])
            ->header('ETag', '"'.$season->version.'"');
    }

    public function update(Request $request, GrowingSeason $season): JsonResponse
    {
        $this->authorizeOwner($request, $season);
        $data = $this->validateInput($request, true);
        $space = array_key_exists('spaceId', $data)
            ? $this->ownedSpace($request, $data['spaceId'])
            : $season->space;
        $startDate = $data['startDate'] ?? $season->start_date->toDateString();
        $endDate = $data['endDate'] ?? $season->end_date->toDateString();
        if ($this->overlaps($space, $startDate, $endDate, $season->id)) {
            return $this->overlapResponse();
        }

        $season->fill($this->attributes($data));
        $season->garden_id = $space->id;
        $season->status = $this->statusFor($startDate, $endDate);
        $season->version++;
        $season->save();

        return response()
            ->json(['data' => ApiData::season($season)])
            ->header('ETag', '"'.$season->version.'"');
    }

    public function destroy(Request $request, GrowingSeason $season): JsonResponse
    {
        $this->authorizeOwner($request, $season);
        if ($season->layouts()->exists() || $season->tasks()->exists()) {
            return response()->json([
                'error' => [
                    'code' => 'SEASON_HAS_DEPENDENCIES',
                    'message' => '작물 배치나 일정이 연결된 시즌은 삭제할 수 없습니다.',
                ],
            ], 409);
        }

        $season->delete();

        return response()->json(status: 204);
    }

    /** @return array<string, mixed> */
    private function validateInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes', 'required'] : ['required'];
        $present = $partial ? ['sometimes', 'present'] : ['present'];
        $nullable = $partial ? ['sometimes', 'nullable'] : ['nullable'];

        return $request->validate([
            'spaceId' => [...$required, 'integer', 'min:1'],
            'name' => [...$required, 'string', 'min:2', 'max:30'],
            'startDate' => [...$required, 'date_format:Y-m-d'],
            'endDate' => [...$required, 'date_format:Y-m-d', 'after_or_equal:startDate'],
            'notes' => [...$present, 'nullable', 'string', 'max:1000'],
            'featuredCropId' => [...$nullable, 'string', 'max:100', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
        ]);
    }

    /** @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        $mapping = [
            'startDate' => 'start_date',
            'endDate' => 'end_date',
            'featuredCropId' => 'featured_crop_slug',
        ];
        $attributes = [];
        foreach ($data as $key => $value) {
            if ($key !== 'spaceId') {
                if ($key === 'notes' && $value === null) {
                    $value = '';
                }
                $attributes[$mapping[$key] ?? $key] = $value;
            }
        }

        return $attributes;
    }

    private function ownedSpace(Request $request, int|string $spaceId): GrowingSpace
    {
        return GrowingSpace::query()
            ->whereKey($spaceId)
            ->where('owner_id', $request->user()->id)
            ->firstOrFail();
    }

    private function overlaps(
        GrowingSpace $space,
        string $startDate,
        string $endDate,
        int|string|null $exceptSeasonId = null,
    ): bool {
        return $space->seasons()
            ->when($exceptSeasonId, fn ($query) => $query->whereKeyNot($exceptSeasonId))
            ->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate)
            ->exists();
    }

    private function overlapResponse(): JsonResponse
    {
        return response()->json([
            'error' => [
                'code' => 'SEASON_DATE_OVERLAP',
                'message' => '같은 공간에 기간이 겹치는 시즌이 있습니다.',
            ],
        ], 409);
    }

    private function authorizeOwner(Request $request, GrowingSeason $season): void
    {
        $season->loadMissing('space');
        abort_unless((string) $season->space->owner_id === (string) $request->user()->id, 403);
    }

    private function statusFor(string $startDate, string $endDate): string
    {
        $today = now()->toDateString();

        return $today < $startDate ? 'planned' : ($today > $endDate ? 'completed' : 'active');
    }
}
