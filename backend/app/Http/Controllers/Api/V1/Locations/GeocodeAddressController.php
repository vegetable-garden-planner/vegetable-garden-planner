<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Locations;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Locations\GeocodeAddressRequest;
use App\Http\Responses\ApiErrorResponse;
use App\Services\Location\KakaoAddressGeocoder;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class GeocodeAddressController extends Controller
{
    public function __invoke(GeocodeAddressRequest $request, KakaoAddressGeocoder $geocoder): JsonResponse
    {
        try {
            $location = $geocoder->find((string) $request->validated('address'));
        } catch (RuntimeException $exception) {
            return ApiErrorResponse::make('GEOCODER_UNAVAILABLE', $exception->getMessage(), 503);
        }

        if ($location === null) {
            return ApiErrorResponse::make('ADDRESS_NOT_FOUND', '검색 결과가 없습니다. 도로명 주소를 확인해 주세요.', 404);
        }

        return response()->json(['data' => $location]);
    }
}
