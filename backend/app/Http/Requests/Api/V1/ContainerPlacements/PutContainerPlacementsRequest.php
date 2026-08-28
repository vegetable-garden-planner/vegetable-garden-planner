<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\ContainerPlacements;

use App\Enums\GrowingSpaceType;
use App\Http\Requests\Api\V1\StrictJsonRequest;
use App\Models\Crop;
use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use Illuminate\Validation\Validator;

class PutContainerPlacementsRequest extends StrictJsonRequest
{
    private const MAX_PLACEMENTS = 200;

    public function authorize(): bool
    {
        $season = $this->route('growingSeason');

        return $season instanceof GrowingSeason && $this->user()?->can('update', $season) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'placements' => ['present', 'array', 'max:'.self::MAX_PLACEMENTS],
            'placements.*' => ['required', 'array:spaceId,cropId,quantity,position'],
            'placements.*.spaceId' => ['required', 'string', 'uuid'],
            'placements.*.cropId' => ['required', 'string', 'max:100', 'exists:crops,id'],
            'placements.*.quantity' => ['required', 'integer', 'min:1', 'max:500'],
            'placements.*.position' => ['nullable'],
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
                if ($validator->errors()->hasAny(['placements'])) {
                    return;
                }

                $placements = $this->input('placements', []);
                if (! is_array($placements)) {
                    return;
                }

                $spaceIds = collect($placements)
                    ->pluck('spaceId')
                    ->filter(fn (mixed $spaceId): bool => is_string($spaceId))
                    ->unique()
                    ->values();

                $ownedContainerSpaces = GrowingSpace::query()
                    ->whereIn('id', $spaceIds)
                    ->where('owner_id', $this->user()?->id)
                    ->where('type', '!=', GrowingSpaceType::Garden->value)
                    ->get()
                    ->keyBy('id');

                $cropIds = collect($placements)
                    ->pluck('cropId')
                    ->filter(fn (mixed $cropId): bool => is_string($cropId))
                    ->unique()
                    ->values();

                $crops = Crop::query()->whereIn('id', $cropIds)->get()->keyBy('id');

                foreach ($placements as $index => $placement) {
                    if (! is_array($placement)) {
                        continue;
                    }

                    $spaceId = $placement['spaceId'] ?? null;
                    $cropId = $placement['cropId'] ?? null;

                    if (! is_string($spaceId) || ! $ownedContainerSpaces->has($spaceId)) {
                        $validator->errors()->add(
                            "placements.{$index}.spaceId",
                            '본인 소유의 화분·베란다만 배치할 수 있습니다.',
                        );

                        continue;
                    }

                    if (is_string($cropId) && $crops->has($cropId)) {
                        $space = $ownedContainerSpaces->get($spaceId);
                        $crop = $crops->get($cropId);
                        if (! in_array($space->type->value, $crop->supported_spaces, true)) {
                            $validator->errors()->add(
                                "placements.{$index}.cropId",
                                '이 화분 유형에 배치할 수 없는 작물입니다.',
                            );
                        }
                    }
                }
            },
        ];
    }

    /** @return list<array{spaceId: string, cropId: string, quantity: int, position: mixed}> */
    public function placements(): array
    {
        /** @var list<array{spaceId: string, cropId: string, quantity: int, position: mixed}> $placements */
        $placements = $this->validated('placements');

        return $placements;
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['placements'];
    }
}
