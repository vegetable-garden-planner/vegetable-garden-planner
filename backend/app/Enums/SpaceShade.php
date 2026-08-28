<?php

declare(strict_types=1);

namespace App\Enums;

enum SpaceShade: string
{
    case None = 'none';
    case Some = 'some';
    case Heavy = 'heavy';
}
