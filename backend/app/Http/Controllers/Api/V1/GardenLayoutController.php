<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GardenLayout;
use App\Models\GrowingSeason;
use App\Support\ApiData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class GardenLayoutController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $layouts = GardenLayout::query()
            ->whereHas('season.space', fn ($query) => $query->where('user_id', $request->user()->id))
            ->latest('updated_at')
            ->get()
            ->map(fn (GardenLayout $layout): array => ApiData::layout($layout));

        return response()->json(['data' => $layouts]);
    }

    public function show(Request $request, GrowingSeason $season): JsonResponse
    {
        $this->authorizeOwner($request, $season);
        $layout = $season->layout()->firstOrFail();

        return response()
            ->json(['data' => ApiData::layout($layout)])
            ->header('ETag', '"'.$layout->version.'"');
    }

    public function upsert(Request $request, GrowingSeason $season): JsonResponse
    {
        $this->authorizeOwner($request, $season);
        $season->loadMissing('space');
        abort_unless($season->space->type === 'garden', 409, '격자 배치는 마당·텃밭 공간에서만 사용할 수 있습니다.');

        $data = $this->validateInput($request);
        $columns = intdiv($data['spaceWidthCm'], $data['cellSizeCm']);
        $rows = intdiv($data['spaceLengthCm'], $data['cellSizeCm']);
        $cellCount = $columns * $rows;
        if ($columns < 1 || $rows < 1 || $cellCount > 400) {
            throw ValidationException::withMessages([
                'cellSizeCm' => ['격자는 1칸 이상 400칸 이하로 만들어 주세요.'],
            ]);
        }
        $this->validatePlacements($data['placements'], $cellCount);

        $layout = $season->layout;
        $created = $layout === null;
        $layout ??= new GardenLayout([
            'season_id' => $season->id,
            'space_id' => $season->space->id,
        ]);
        $layout->fill([
            'space_width_cm' => $data['spaceWidthCm'],
            'space_length_cm' => $data['spaceLengthCm'],
            'cell_size_cm' => $data['cellSizeCm'],
            'columns' => $columns,
            'rows' => $rows,
            'placements' => $data['placements'],
            'version' => $created ? 1 : $layout->version + 1,
        ]);
        $layout->save();

        return response()
            ->json(['data' => ApiData::layout($layout)], $created ? 201 : 200)
            ->header('ETag', '"'.$layout->version.'"');
    }

    public function destroy(Request $request, GrowingSeason $season): JsonResponse
    {
        $this->authorizeOwner($request, $season);
        $season->layout()->firstOrFail()->delete();

        return response()->json(status: 204);
    }

    /** @return array<string, mixed> */
    private function validateInput(Request $request): array
    {
        return $request->validate([
            'spaceWidthCm' => ['required', 'integer', 'min:10'],
            'spaceLengthCm' => ['required', 'integer', 'min:10'],
            'cellSizeCm' => ['required', 'integer', 'in:10,25,50,100'],
            'placements' => ['present', 'array', 'max:400'],
            'placements.*.cellIndex' => ['required', 'integer', 'min:0'],
            'placements.*.cropId' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
        ]);
    }

    /** @param array<int, array<string, mixed>> $placements */
    private function validatePlacements(array $placements, int $cellCount): void
    {
        $indexes = array_column($placements, 'cellIndex');
        $validator = Validator::make(['indexes' => $indexes], []);
        $validator->after(function ($validator) use ($indexes, $cellCount): void {
            if (count($indexes) !== count(array_unique($indexes))) {
                $validator->errors()->add('placements', '한 칸에는 작물을 하나만 배치할 수 있습니다.');
            }
            if (array_filter($indexes, fn ($index): bool => $index >= $cellCount) !== []) {
                $validator->errors()->add('placements', '격자 범위를 벗어난 작물 배치가 있습니다.');
            }
        });
        $validator->validate();
    }

    private function authorizeOwner(Request $request, GrowingSeason $season): void
    {
        $season->loadMissing('space');
        abort_unless((string) $season->space->user_id === (string) $request->user()->id, 403);
    }
}
