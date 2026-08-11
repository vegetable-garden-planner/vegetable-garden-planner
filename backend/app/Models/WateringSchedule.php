<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\WateringScheduleFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WateringSchedule extends Model
{
    /** @use HasFactory<WateringScheduleFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'growing_season_id',
        'crop_id',
        'interval_days',
        'next_watering_at',
        'enabled',
        'version',
    ];

    /** @return BelongsTo<GrowingSeason, $this> */
    public function growingSeason(): BelongsTo
    {
        return $this->belongsTo(GrowingSeason::class);
    }

    /** @return BelongsTo<Crop, $this> */
    public function crop(): BelongsTo
    {
        return $this->belongsTo(Crop::class);
    }

    /** @return HasMany<WateringLog, $this> */
    public function logs(): HasMany
    {
        return $this->hasMany(WateringLog::class);
    }

    /** @return HasMany<WateringSnooze, $this> */
    public function snoozes(): HasMany
    {
        return $this->hasMany(WateringSnooze::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'interval_days' => 'integer',
            'next_watering_at' => 'immutable_datetime',
            'enabled' => 'boolean',
            'version' => 'integer',
        ];
    }
}
