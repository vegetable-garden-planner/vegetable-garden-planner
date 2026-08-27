<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Crop extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    /** @return BelongsTo<CropSource, $this> */
    public function source(): BelongsTo
    {
        return $this->belongsTo(CropSource::class, 'source_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'supported_spaces' => 'array',
            'planting_period' => 'array',
            'harvest_period' => 'array',
            'plant_spacing_cm' => 'integer',
            'min_pot_depth_cm' => 'integer',
            'needs_support' => 'boolean',
            'care_guide' => 'array',
            'companions' => 'array',
        ];
    }
}
