<?php

declare(strict_types=1);

namespace App\Services\Location;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class KakaoAddressGeocoder
{
    /** @return array{address: string, latitude: float, longitude: float}|null */
    public function find(string $address): ?array
    {
        $apiKey = (string) config('services.kakao.rest_api_key');
        if ($apiKey === '') {
            throw new RuntimeException('KAKAO_REST_API_KEY가 설정되지 않았습니다.');
        }

        try {
            $response = Http::acceptJson()
                ->withHeaders(['Authorization' => "KakaoAK {$apiKey}"])
                ->timeout(5)
                ->retry(2, 150, throw: false)
                ->get('https://dapi.kakao.com/v2/local/search/address.json', [
                    'query' => $address,
                    'size' => 1,
                ]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('주소 검색 서버에 연결하지 못했습니다.', previous: $exception);
        }

        if (in_array($response->status(), [401, 403], true)) {
            throw new RuntimeException('카카오 REST API 키가 올바르지 않거나 주소 검색 권한이 없습니다.');
        }

        if ($response->status() === 429) {
            throw new RuntimeException('주소 검색 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
        }

        if ($response->failed()) {
            throw new RuntimeException('주소 검색 서버가 요청을 처리하지 못했습니다.');
        }

        $document = $response->json('documents.0');
        if (! is_array($document)) {
            return null;
        }

        return [
            'address' => (string) ($document['address_name'] ?? $address),
            'latitude' => (float) ($document['y'] ?? 0),
            'longitude' => (float) ($document['x'] ?? 0),
        ];
    }
}
