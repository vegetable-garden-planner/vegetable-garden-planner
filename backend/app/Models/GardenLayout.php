<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GardenLayout extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'growing_season_id';

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = [
        'growing_season_id',
        'growing_space_id',
        'space_width_cm',
        'space_length_cm',
        'cell_size_cm',
        'columns',
        'rows',
        'version',
    ];

    /** @return BelongsTo<GrowingSeason, $this> */
    public function growingSeason(): BelongsTo
    {
        return $this->belongsTo(GrowingSeason::class);
    }

    /** @return BelongsTo<GrowingSpace, $this> */
    public function growingSpace(): BelongsTo
    {
        return $this->belongsTo(GrowingSpace::class);
    }

    /** @return HasMany<GardenLayoutPlacement, $this> */
    public function placements(): HasMany
    {
        return $this->hasMany(GardenLayoutPlacement::class, 'growing_season_id', 'growing_season_id')
            ->orderBy('cell_index');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'space_width_cm' => 'integer',
            'space_length_cm' => 'integer',
            'cell_size_cm' => 'integer',
            'columns' => 'integer',
            'rows' => 'integer',
            'version' => 'integer',
        ];
    }
}
