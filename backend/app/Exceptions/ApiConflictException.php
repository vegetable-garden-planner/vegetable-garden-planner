<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class ApiConflictException extends RuntimeException
{
    public function __construct(
        private readonly string $errorCode,
        string $message,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, previous: $previous);
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }
}
