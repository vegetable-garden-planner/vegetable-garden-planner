<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GrowingSpace extends Model
{
    protected $table = 'gardens';

    protected $fillable = [
        'name',
        'space_type',
        'sunlight',
        'width',
        'height',
        'cell_size',
        'environment',
        'region_id',
        'notes',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'width' => 'float',
            'height' => 'float',
            'cell_size' => 'float',
            'version' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function seasons(): HasMany
    {
        return $this->hasMany(GrowingSeason::class, 'garden_id');
    }
}
