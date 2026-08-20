<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CultivationRecordType;
use Database\Factories\CultivationRecordFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CultivationRecord extends Model
{
    /** @use HasFactory<CultivationRecordFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'growing_season_id',
        'type',
        'occurred_at',
        'notes',
        'quantity',
        'unit',
        'photo_path',
        'version',
    ];

    /** @return BelongsTo<GrowingSeason, $this> */
    public function growingSeason(): BelongsTo
    {
        return $this->belongsTo(GrowingSeason::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'type' => CultivationRecordType::class,
            'occurred_at' => 'immutable_datetime',
            'quantity' => 'decimal:3',
            'version' => 'integer',
        ];
    }
}
