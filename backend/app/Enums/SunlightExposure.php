<?php

declare(strict_types=1);

namespace App\Enums;

enum SunlightExposure: string
{
    case Low = 'low';
    case Partial = 'partial';
    case Full = 'full';
}
