<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GardenLayout extends Model
{
    protected $table = 'layout_versions';

    protected $fillable = [
        'season_id',
        'created_by',
        'version',
        'layout_data',
    ];

    protected function casts(): array
    {
        return [
            'layout_data' => 'array',
            'version' => 'integer',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(GrowingSeason::class, 'season_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
