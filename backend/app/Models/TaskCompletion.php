<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskCompletion extends Model
{
    public $timestamps = false;

    protected $fillable = ['task_id', 'user_id', 'completed_at', 'memo'];

    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }
}
