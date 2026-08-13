<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Layouts;

use App\Http\Requests\Api\V1\StrictJsonRequest;
use App\Models\Crop;
use App\Models\GrowingSeason;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PutGardenLayoutRequest extends StrictJsonRequest
{
    private const CELL_SIZES = [10, 25, 50, 100];

    private const MAX_CELLS = 400;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'spaceWidthCm' => ['required', 'integer', 'min:10', 'max:100000'],
            'spaceLengthCm' => ['required', 'integer', 'min:10', 'max:100000'],
            'cellSizeCm' => ['required', 'integer', Rule::in(self::CELL_SIZES)],
            'placements' => ['present', 'array', 'max:'.self::MAX_CELLS],
            'placements.*' => ['required', 'array:cellIndex,cropId'],
            'placements.*.cellIndex' => ['required', 'integer', 'min:0', 'distinct:strict'],
            'placements.*.cropId' => ['required', 'string', 'max:100', 'exists:crops,id'],
        ];
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['spaceWidthCm', 'spaceLengthCm', 'cellSizeCm', 'placements'])) {
                    return;
                }

                $columns = intdiv($this->integer('spaceWidthCm'), $this->integer('cellSizeCm'));
                $rows = intdiv($this->integer('spaceLengthCm'), $this->integer('cellSizeCm'));
                $cellCount = $columns * $rows;

                if ($columns < 1 || $rows < 1) {
                    $validator->errors()->add('cellSizeCm', '선택한 칸 크기보다 재배 공간이 작습니다.');

                    return;
                }

                if ($cellCount > self::MAX_CELLS) {
                    $validator->errors()->add('cellSizeCm', '격자는 최대 400칸까지 만들 수 있습니다.');

                    return;
                }

                $placements = $this->input('placements', []);
                if (! is_array($placements)) {
                    return;
                }

                foreach ($placements as $index => $placement) {
                    if (! is_array($placement) || ! isset($placement['cellIndex'])) {
                        continue;
                    }

                    if ((int) $placement['cellIndex'] >= $cellCount) {
                        $validator->errors()->add("placements.{$index}.cellIndex", '격자 범위를 벗어난 칸입니다.');
                    }
                }

                $cropIds = collect($placements)
                    ->pluck('cropId')
                    ->filter(fn (mixed $cropId): bool => is_string($cropId))
                    ->unique()
                    ->values();

                if ($cropIds->isEmpty()) {
                    return;
                }

                $season = $this->route('growingSeason');
                if (! $season instanceof GrowingSeason) {
                    $validator->errors()->add('placements', '재배 시즌 정보를 확인할 수 없습니다.');

                    return;
                }

                $space = $season->growingSpace()->first();
                if ($space === null) {
                    $validator->errors()->add('placements', '시즌에 연결된 재배 공간을 확인할 수 없습니다.');

                    return;
                }

                $spaceType = $space->type->value;
                $supportedCropIds = Crop::query()
                    ->whereIn('id', $cropIds)
                    ->get()
                    ->filter(fn (Crop $crop): bool => in_array($spaceType, $crop->supported_spaces, true))
                    ->pluck('id');

                foreach ($placements as $index => $placement) {
                    if (is_array($placement)
                        && isset($placement['cropId'])
                        && is_string($placement['cropId'])
                        && ! $supportedCropIds->contains($placement['cropId'])) {
                        $validator->errors()->add("placements.{$index}.cropId", '선택한 재배 공간에 배치할 수 없는 작물입니다.');
                    }
                }
            },
        ];
    }

    /** @return array{spaceWidthCm: int, spaceLengthCm: int, cellSizeCm: int} */
    public function layoutAttributes(): array
    {
        return [
            'spaceWidthCm' => $this->integer('spaceWidthCm'),
            'spaceLengthCm' => $this->integer('spaceLengthCm'),
            'cellSizeCm' => $this->integer('cellSizeCm'),
        ];
    }

    /** @return list<array{cellIndex: int, cropId: string}> */
    public function placements(): array
    {
        /** @var list<array{cellIndex: int, cropId: string}> $placements */
        $placements = $this->validated('placements');

        return $placements;
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['spaceWidthCm', 'spaceLengthCm', 'cellSizeCm', 'placements'];
    }
}
