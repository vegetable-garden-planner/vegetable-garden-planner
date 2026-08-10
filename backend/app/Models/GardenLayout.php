<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GardenLayout extends Model
{
    protected $primaryKey = 'season_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'season_id',
        'space_id',
        'space_width_cm',
        'space_length_cm',
        'cell_size_cm',
        'columns',
        'rows',
        'placements',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'space_width_cm' => 'integer',
            'space_length_cm' => 'integer',
            'cell_size_cm' => 'integer',
            'columns' => 'integer',
            'rows' => 'integer',
            'placements' => 'array',
            'version' => 'integer',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(GrowingSeason::class, 'season_id');
    }
}
