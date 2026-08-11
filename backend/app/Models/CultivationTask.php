<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CultivationTask extends Model
{
    protected $table = 'tasks';

    protected $fillable = [
        'planting_id',
        'task_type_id',
        'title',
        'due_date',
        'notes',
        'status',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'version' => 'integer',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(GrowingSeason::class, 'season_id');
    }

    public function planting(): BelongsTo
    {
        return $this->belongsTo(Planting::class);
    }

    public function taskType(): BelongsTo
    {
        return $this->belongsTo(TaskType::class);
    }

    public function completions(): HasMany
    {
        return $this->hasMany(TaskCompletion::class, 'task_id');
    }
}
