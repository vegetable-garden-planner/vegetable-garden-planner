<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GrowingSpace extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'type',
        'sunlight',
        'width_cm',
        'length_cm',
        'region',
        'notes',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'width_cm' => 'integer',
            'length_cm' => 'integer',
            'version' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function seasons(): HasMany
    {
        return $this->hasMany(GrowingSeason::class);
    }
}
