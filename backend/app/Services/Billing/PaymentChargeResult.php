<?php

declare(strict_types=1);

namespace App\Services\Billing;

final readonly class PaymentChargeResult
{
    public function __construct(
        public bool $success,
        public ?string $failureReason = null,
    ) {}

    public static function success(): self
    {
        return new self(true);
    }

    public static function failure(string $reason): self
    {
        return new self(false, $reason);
    }
}
