<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

final class ApiErrorResponse
{
    /**
     * @param  array<string, list<string>>  $fields
     */
    public static function make(
        string $code,
        string $message,
        int $status,
        array $fields = [],
    ): JsonResponse {
        $error = [
            'code' => $code,
            'message' => $message,
        ];

        if ($fields !== []) {
            $error['fields'] = $fields;
        }

        return response()->json(['error' => $error], $status);
    }
}
