<?php

declare(strict_types=1);

namespace App\Enums;

enum GardenAssistantIntent: string
{
    case WateringTiming = 'watering_timing';
    case YellowLeaves = 'yellow_leaves';
    case LowLight = 'low_light';
    case LogWatering = 'log_watering';
}
