<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\GrowingSeasonFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class GrowingSeason extends Model
{
    /** @use HasFactory<GrowingSeasonFactory> */
    use HasFactory, HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'growing_space_id',
        'name',
        'start_date',
        'end_date',
        'notes',
        'featured_crop_id',
    ];

    /**
     * @return BelongsTo<GrowingSpace, $this>
     */
    public function growingSpace(): BelongsTo
    {
        return $this->belongsTo(GrowingSpace::class);
    }

    /** @return HasOne<GardenLayout, $this> */
    public function layout(): HasOne
    {
        return $this->hasOne(GardenLayout::class);
    }

    /** @return HasMany<CultivationTask, $this> */
    public function tasks(): HasMany
    {
        return $this->hasMany(CultivationTask::class);
    }

    /** @return HasMany<CultivationRecord, $this> */
    public function records(): HasMany
    {
        return $this->hasMany(CultivationRecord::class);
    }

    /** @return HasMany<WateringSchedule, $this> */
    public function wateringSchedules(): HasMany
    {
        return $this->hasMany(WateringSchedule::class);
    }

    /** @return HasMany<ContainerPlacement, $this> */
    public function containerPlacements(): HasMany
    {
        return $this->hasMany(ContainerPlacement::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'immutable_date',
            'end_date' => 'immutable_date',
            'version' => 'integer',
        ];
    }
}
