<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CropSource extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['reviewed_at' => 'date'];
    }

    /** @return HasMany<Crop, $this> */
    public function crops(): HasMany
    {
        return $this->hasMany(Crop::class, 'source_id');
    }
}
