<?php

declare(strict_types=1);

namespace App\Actions\Seasons;

use App\Models\GrowingSeason;
use App\Models\GrowingSpace;
use Illuminate\Support\Facades\DB;

final class CreateGrowingSeason
{
    public function __construct(private readonly EnsureSeasonPeriodAvailable $ensurePeriodAvailable) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(GrowingSpace $space, array $attributes): GrowingSeason
    {
        return DB::transaction(function () use ($space, $attributes): GrowingSeason {
            $lockedSpace = GrowingSpace::query()->lockForUpdate()->findOrFail($space->id);
            $startDate = (string) $attributes['start_date'];
            $endDate = (string) $attributes['end_date'];

            $this->ensurePeriodAvailable->execute($lockedSpace->id, $startDate, $endDate);

            $season = $lockedSpace->seasons()->create([
                ...$attributes,
                'growing_space_id' => $lockedSpace->id,
            ]);

            return $season->refresh();
        });
    }
}
