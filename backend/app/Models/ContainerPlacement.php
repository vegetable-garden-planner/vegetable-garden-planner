<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContainerPlacement extends Model
{
    use HasUuids;

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'growing_space_id',
        'crop_id',
        'quantity',
        'position',
    ];

    /** @return BelongsTo<GrowingSeason, $this> */
    public function growingSeason(): BelongsTo
    {
        return $this->belongsTo(GrowingSeason::class);
    }

    /** @return BelongsTo<GrowingSpace, $this> */
    public function growingSpace(): BelongsTo
    {
        return $this->belongsTo(GrowingSpace::class);
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
            'quantity' => 'integer',
            'position' => 'array',
        ];
    }
}
