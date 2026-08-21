<?php

declare(strict_types=1);

namespace App\Services\Billing;

final readonly class BillingKeyIssueResult
{
    public function __construct(
        public bool $success,
        public ?string $billingKey = null,
        public ?string $customerKey = null,
        public ?string $failureReason = null,
    ) {}

    public static function success(string $billingKey, string $customerKey): self
    {
        return new self(true, $billingKey, $customerKey);
    }

    public static function failure(string $reason): self
    {
        return new self(false, failureReason: $reason);
    }
}
