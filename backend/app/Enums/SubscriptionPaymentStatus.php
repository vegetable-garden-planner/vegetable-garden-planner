<?php

declare(strict_types=1);

namespace App\Enums;

enum SubscriptionPaymentStatus: string
{
    case Paid = 'paid';
    case Failed = 'failed';
}
