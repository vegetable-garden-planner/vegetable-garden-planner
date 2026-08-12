<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\GrowingSpaceType;
use App\Enums\SpaceOrientation;
use App\Enums\SunlightExposure;
use Database\Factories\GrowingSpaceFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GrowingSpace extends Model
{
    /** @use HasFactory<GrowingSpaceFactory> */
    use HasFactory, HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'type',
        'sunlight',
        'width_cm',
        'length_cm',
        'region',
        'address',
        'latitude',
        'longitude',
        'orientation',
        'estimated_sunlight_hours',
        'notes',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * @return HasMany<GrowingSeason, $this>
     */
    public function seasons(): HasMany
    {
        return $this->hasMany(GrowingSeason::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => GrowingSpaceType::class,
            'sunlight' => SunlightExposure::class,
            'width_cm' => 'integer',
            'length_cm' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'orientation' => SpaceOrientation::class,
            'estimated_sunlight_hours' => 'decimal:1',
            'version' => 'integer',
        ];
    }
}
