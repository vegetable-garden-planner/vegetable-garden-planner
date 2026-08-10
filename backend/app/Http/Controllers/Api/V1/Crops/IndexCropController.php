<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Crops;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Crops\IndexCropRequest;
use App\Http\Resources\Api\V1\CropResource;
use App\Http\Responses\PaginatedResponse;
use App\Models\Crop;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class IndexCropController extends Controller
{
    public function __invoke(IndexCropRequest $request): JsonResponse
    {
        $paginator = Crop::query()
            ->when($request->queryText() !== '', function (Builder $query) use ($request): void {
                $search = '%'.$request->queryText().'%';
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', $search)
                        ->orWhere('family_name', 'like', $search)
                        ->orWhere('summary', 'like', $search);
                });
            })
            ->when($request->category(), fn (Builder $query, string $category): Builder => $query->where('category', $category))
            ->when($request->space(), fn (Builder $query, string $space): Builder => $query->whereJsonContains('supported_spaces', $space))
            ->orderBy('name')
            ->paginate($request->perPage());

        $data = array_map(
            static fn (Crop $crop): array => CropResource::make($crop)->resolve(),
            $paginator->items(),
        );

        return PaginatedResponse::make($paginator, $data);
    }
}
