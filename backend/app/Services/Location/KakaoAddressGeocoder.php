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
                ->retry(2, 150)
                ->get('https://dapi.kakao.com/v2/local/search/address.json', [
                    'query' => $address,
                    'size' => 1,
                ]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('주소 검색 서버에 연결하지 못했습니다.', previous: $exception);
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
