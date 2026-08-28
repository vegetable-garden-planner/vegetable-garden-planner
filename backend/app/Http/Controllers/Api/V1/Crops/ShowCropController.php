<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Crops;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\CropResource;
use App\Models\Crop;
use Illuminate\Http\JsonResponse;

class ShowCropController extends Controller
{
    public function __invoke(Crop $crop): JsonResponse
    {
        return response()->json(['data' => CropResource::make($crop)->resolve()]);
    }
}
