<?php

declare(strict_types=1);

namespace App\Actions\Spaces;

use App\Models\GrowingSpace;
use App\Support\Http\EntityTag;
use Illuminate\Support\Facades\DB;

final class UpdateGrowingSpace
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(GrowingSpace $space, array $attributes, ?string $ifMatch): GrowingSpace
    {
        $expectedVersion = EntityTag::versionFromIfMatch($ifMatch);

        $updated = GrowingSpace::query()
            ->whereKey($space->id)
            ->where('version', $expectedVersion)
            ->update([
                ...$attributes,
                'version' => DB::raw('version + 1'),
                'updated_at' => now(),
            ]);

        if ($updated !== 1) {
            EntityTag::versionConflict();
        }

        return $space->refresh();
    }
}
