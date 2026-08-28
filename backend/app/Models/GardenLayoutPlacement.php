<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GardenLayoutPlacement extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'cell_index';

    /** @var list<string> */
    protected $fillable = ['cell_index', 'crop_id'];

    /** @return BelongsTo<GardenLayout, $this> */
    public function layout(): BelongsTo
    {
        return $this->belongsTo(GardenLayout::class, 'growing_season_id', 'growing_season_id');
    }

    /** @return BelongsTo<Crop, $this> */
    public function crop(): BelongsTo
    {
        return $this->belongsTo(Crop::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['cell_index' => 'integer'];
    }
}
