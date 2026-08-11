<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GrowingSpace;
use App\Support\ApiData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GrowingSpaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $spaces = GrowingSpace::query()
            ->with('region')
            ->where('owner_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn (GrowingSpace $space): array => ApiData::space($space));

        return response()->json(['data' => $spaces]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateInput($request);
        $space = new GrowingSpace($this->attributes($data));
        $space->owner_id = $request->user()->id;
        $space->region_id = $this->resolveRegionId($data['region']);
        $space->cell_size = 25;
        $space->save();

        return response()
            ->json(['data' => ApiData::space($space)], 201)
            ->header('ETag', '"'.$space->version.'"');
    }

    public function show(Request $request, GrowingSpace $space): JsonResponse
    {
        $this->authorizeOwner($request, $space);

        return response()
            ->json(['data' => ApiData::space($space)])
            ->header('ETag', '"'.$space->version.'"');
    }

    public function update(Request $request, GrowingSpace $space): JsonResponse
    {
        $this->authorizeOwner($request, $space);
        $data = $this->validateInput($request, true);
        $space->fill($this->attributes($data));
        if (array_key_exists('region', $data)) {
            $space->region_id = $this->resolveRegionId($data['region']);
        }
        $space->version++;
        $space->save();

        return response()
            ->json(['data' => ApiData::space($space)])
            ->header('ETag', '"'.$space->version.'"');
    }

    public function destroy(Request $request, GrowingSpace $space): JsonResponse
    {
        $this->authorizeOwner($request, $space);
        if ($space->seasons()->exists()) {
            return response()->json([
                'error' => [
                    'code' => 'SPACE_HAS_SEASONS',
                    'message' => '연결된 시즌이 있는 공간은 삭제할 수 없습니다.',
                ],
            ], 409);
        }

        $space->delete();

        return response()->json(status: 204);
    }

    /** @return array<string, mixed> */
    private function validateInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes', 'required'] : ['required'];
        $present = $partial ? ['sometimes', 'present'] : ['present'];

        return $request->validate([
            'name' => [...$required, 'string', 'max:30'],
            'type' => [...$required, 'in:indoor,balcony,garden'],
            'sunlight' => [...$required, 'in:low,partial,full'],
            'widthCm' => [...$required, 'integer', 'min:10', 'max:100000'],
            'lengthCm' => [...$required, 'integer', 'min:10', 'max:100000'],
            'region' => [...$required, 'string', 'max:100'],
            'notes' => [...$present, 'nullable', 'string', 'max:1000'],
        ]);
    }

    /** @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        $mapping = [
            'type' => 'space_type',
            'widthCm' => 'width',
            'lengthCm' => 'height',
        ];
        $attributes = [];
        foreach ($data as $key => $value) {
            if ($key === 'region') {
                continue;
            }
            if ($key === 'notes' && $value === null) {
                $value = '';
            }
            $attributes[$mapping[$key] ?? $key] = $value;
        }
        if (array_key_exists('sunlight', $data)) {
            $attributes['environment'] = $data['sunlight'];
        }

        return $attributes;
    }

    private function authorizeOwner(Request $request, GrowingSpace $space): void
    {
        abort_unless((string) $space->owner_id === (string) $request->user()->id, 403);
    }

    private function resolveRegionId(string $name): int
    {
        $climateZoneId = DB::table('climate_zones')->where('name', '기타')->value('id');
        if ($climateZoneId === null) {
            $climateZoneId = DB::table('climate_zones')->insertGetId([
                'name' => '기타',
                'description' => '사용자 입력 지역을 위한 기본 기후 구역',
            ]);
        }

        $regionId = DB::table('regions')->where('name', $name)->value('id');

        return (int) ($regionId ?? DB::table('regions')->insertGetId([
            'climate_zone_id' => $climateZoneId,
            'name' => $name,
        ]));
    }
}
