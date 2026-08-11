<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CultivationTaskStatus;
use App\Enums\CultivationTaskType;
use Database\Factories\CultivationTaskFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CultivationTask extends Model
{
    /** @use HasFactory<CultivationTaskFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'growing_season_id',
        'crop_id',
        'type',
        'title',
        'due_date',
        'notes',
        'status',
        'completed_at',
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

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'type' => CultivationTaskType::class,
            'status' => CultivationTaskStatus::class,
            'due_date' => 'immutable_date',
            'completed_at' => 'immutable_datetime',
            'version' => 'integer',
        ];
    }
}
