<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case Member = 'member';
    case Admin = 'admin';
}
