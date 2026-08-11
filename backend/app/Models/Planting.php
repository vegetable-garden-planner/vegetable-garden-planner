<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Planting extends Model
{
    public $timestamps = false;

    protected $fillable = ['season_id', 'crop_id', 'start_x', 'start_y', 'width', 'height'];

    public function crop(): BelongsTo
    {
        return $this->belongsTo(Crop::class);
    }
}
