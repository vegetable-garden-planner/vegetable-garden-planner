<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Seasons;

use App\Enums\GrowingSeasonStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Seasons\IndexSeasonRequest;
use App\Http\Resources\Api\V1\GrowingSeasonResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\GrowingSeason;
use App\Support\Auth\AuthenticatedUser;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class IndexSeasonController extends Controller
{
    public function __invoke(IndexSeasonRequest $request): JsonResponse
    {
        $user = AuthenticatedUser::from($request);
        $today = CarbonImmutable::today((string) config('app.business_timezone'))->toDateString();

        $query = GrowingSeason::query()
            ->whereHas(
                'growingSpace',
                fn (Builder $query): Builder => $query->where('owner_id', $user->id),
            )
            ->when(
                $request->spaceId() !== null,
                fn (Builder $query): Builder => $query->where('growing_space_id', $request->spaceId()),
            );

        $this->applyStatusFilter($query, $request->status(), $today);

        $paginator = $query->latest('start_date')->paginate($request->perPage());
        $data = array_map(
            static fn (GrowingSeason $season): array => GrowingSeasonResource::make($season)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }

    /**
     * @param  Builder<GrowingSeason>  $query
     */
    private function applyStatusFilter(
        Builder $query,
        ?GrowingSeasonStatus $status,
        string $today,
    ): void {
        match ($status) {
            GrowingSeasonStatus::Planned => $query->whereDate('start_date', '>', $today),
            GrowingSeasonStatus::Active => $query
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today),
            GrowingSeasonStatus::Completed => $query->whereDate('end_date', '<', $today),
            null => null,
        };
    }
}
