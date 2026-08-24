<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Records;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Records\IndexRecordRequest;
use App\Http\Resources\Api\V1\CultivationRecordResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\CultivationRecord;
use App\Support\Auth\AuthenticatedUser;
use Illuminate\Http\JsonResponse;

class IndexRecordController extends Controller
{
    public function __invoke(IndexRecordRequest $request): JsonResponse
    {
        $user = AuthenticatedUser::from($request);
        $query = CultivationRecord::query()
            ->whereHas(
                'growingSeason.growingSpace',
                static fn ($query) => $query->where('owner_id', $user->id),
            );

        if ($request->type() !== null) {
            $query->where('type', $request->type());
        }

        $paginator = $query
            ->latest('occurred_at')
            ->latest('created_at')
            ->paginate($request->perPage());
        $data = array_map(
            static fn (CultivationRecord $record): array => CultivationRecordResource::make($record)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
