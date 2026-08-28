<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\WateringLogFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WateringLog extends Model
{
    /** @use HasFactory<WateringLogFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'watering_schedule_id',
        'user_id',
        'scheduled_for',
        'watered_at',
        'amount_ml',
        'memo',
    ];

    /** @return BelongsTo<WateringSchedule, $this> */
    public function wateringSchedule(): BelongsTo
    {
        return $this->belongsTo(WateringSchedule::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'scheduled_for' => 'immutable_datetime',
            'watered_at' => 'immutable_datetime',
            'amount_ml' => 'integer',
        ];
    }
}
