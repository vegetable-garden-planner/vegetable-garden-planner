<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\GrowingSeasonFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
