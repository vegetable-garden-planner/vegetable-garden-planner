<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CultivationTask extends Model
{
    use HasUuids;

    protected $fillable = [
        'crop_id',
        'type',
        'title',
        'due_date',
        'notes',
        'status',
        'completed_at',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
            'version' => 'integer',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(GrowingSeason::class, 'season_id');
    }
}
