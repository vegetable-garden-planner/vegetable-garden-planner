<?php

declare(strict_types=1);

namespace App\Enums;

enum CultivationRecordType: string
{
    case Watering = 'watering';
    case Work = 'work';
    case Growth = 'growth';
    case Harvest = 'harvest';
}
