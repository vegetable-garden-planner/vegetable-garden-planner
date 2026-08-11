<?php

declare(strict_types=1);

namespace App\Enums;

enum CultivationTaskType: string
{
    case Watering = 'watering';
    case Sowing = 'sowing';
    case Transplanting = 'transplanting';
    case Fertilizing = 'fertilizing';
    case Support = 'support';
    case Harvest = 'harvest';
    case Other = 'other';
}
