<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Crops;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\CropSourceResource;
use App\Models\CropSource;
use Illuminate\Http\JsonResponse;

class IndexCropSourceController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => CropSource::query()
                ->orderBy('organization')
                ->get()
                ->map(static fn (CropSource $source): array => CropSourceResource::make($source)->resolve())
                ->all(),
        ]);
    }
}
