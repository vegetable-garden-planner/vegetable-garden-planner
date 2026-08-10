<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class GrowingSeason extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'notes',
        'featured_crop_id',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'version' => 'integer',
        ];
    }

    public function space(): BelongsTo
    {
        return $this->belongsTo(GrowingSpace::class, 'growing_space_id');
    }

    public function layout(): HasOne
    {
        return $this->hasOne(GardenLayout::class, 'season_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(CultivationTask::class, 'season_id');
    }
}
