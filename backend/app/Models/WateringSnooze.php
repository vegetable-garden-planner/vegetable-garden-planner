<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\WateringSnoozeFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WateringSnooze extends Model
{
    /** @use HasFactory<WateringSnoozeFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'watering_schedule_id',
        'original_at',
        'snoozed_until',
    ];

    /** @return BelongsTo<WateringSchedule, $this> */
    public function wateringSchedule(): BelongsTo
    {
        return $this->belongsTo(WateringSchedule::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'original_at' => 'immutable_datetime',
            'snoozed_until' => 'immutable_datetime',
        ];
    }
}
