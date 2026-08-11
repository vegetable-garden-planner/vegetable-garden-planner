<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Crop extends Model
{
    public $timestamps = false;

    protected $fillable = ['family_id', 'slug', 'name', 'image', 'difficulty', 'description'];
}
