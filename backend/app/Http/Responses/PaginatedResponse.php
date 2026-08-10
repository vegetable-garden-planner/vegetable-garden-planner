<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

final class PaginatedResponse
{
    /**
     * @param  list<array<string, mixed>>  $data
     */
    public static function make(LengthAwarePaginator $paginator, array $data): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'meta' => [
                'currentPage' => $paginator->currentPage(),
                'perPage' => $paginator->perPage(),
                'total' => $paginator->total(),
                'lastPage' => $paginator->lastPage(),
            ],
        ]);
    }
}
