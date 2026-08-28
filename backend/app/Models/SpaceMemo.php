<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SpaceMemoFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpaceMemo extends Model
{
    /** @use HasFactory<SpaceMemoFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'growing_space_id',
        'crop_id',
        'body',
        'version',
    ];

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
            'version' => 'integer',
        ];
    }
}
