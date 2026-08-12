<?php

declare(strict_types=1);

namespace App\Enums;

enum SpaceOrientation: string
{
    case Open = 'open';
    case North = 'north';
    case NorthEast = 'northeast';
    case East = 'east';
    case SouthEast = 'southeast';
    case South = 'south';
    case SouthWest = 'southwest';
    case West = 'west';
    case NorthWest = 'northwest';
}
