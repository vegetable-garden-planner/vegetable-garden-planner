<?php

declare(strict_types=1);

namespace App\Enums;

enum GrowingSpaceType: string
{
    case Indoor = 'indoor';
    case Balcony = 'balcony';
    case Garden = 'garden';
}
