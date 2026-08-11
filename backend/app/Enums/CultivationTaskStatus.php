<?php

declare(strict_types=1);

namespace App\Enums;

enum CultivationTaskStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
}
