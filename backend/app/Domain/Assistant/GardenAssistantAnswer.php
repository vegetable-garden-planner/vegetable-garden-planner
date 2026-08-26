<?php

declare(strict_types=1);

namespace App\Domain\Assistant;

use App\Enums\GardenAssistantIntent;

final class GardenAssistantAnswer
{
    public function __construct(
        public readonly GardenAssistantIntent $intent,
        public readonly string $message,
        public readonly bool $actionPerformed,
        public readonly ?string $cropId = null,
    ) {}
}
