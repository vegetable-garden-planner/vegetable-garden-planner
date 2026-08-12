<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Locations;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeocodeAddressApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_convert_address_to_coordinates(): void
    {
        config(['services.kakao.rest_api_key' => 'test-key']);
        Http::fake([
            'dapi.kakao.com/*' => Http::response([
                'documents' => [[
                    'address_name' => '서울 중구 태평로1가 31',
                    'x' => '126.977829174031',
                    'y' => '37.5663174209601',
                ]],
            ]),
        ]);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/locations/geocode?address='.urlencode('서울특별시청'))
            ->assertOk()
            ->assertJsonPath('data.address', '서울 중구 태평로1가 31')
            ->assertJsonPath('data.latitude', 37.5663174209601)
            ->assertJsonPath('data.longitude', 126.977829174031);

        Http::assertSent(fn ($request): bool => $request->hasHeader('Authorization', 'KakaoAK test-key'));
    }

    public function test_geocoder_rejects_guests_and_reports_missing_configuration(): void
    {
        $this->getJson('/api/v1/locations/geocode?address=서울시청')->assertUnauthorized();

        config(['services.kakao.rest_api_key' => null]);
        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/locations/geocode?address=서울시청')
            ->assertStatus(503)
            ->assertJsonPath('error.code', 'GEOCODER_UNAVAILABLE');
    }

    public function test_empty_result_is_not_hidden_as_a_valid_location(): void
    {
        config(['services.kakao.rest_api_key' => 'test-key']);
        Http::fake(['dapi.kakao.com/*' => Http::response(['documents' => []])]);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/locations/geocode?address=없는주소')
            ->assertNotFound()
            ->assertJsonPath('error.code', 'ADDRESS_NOT_FOUND');
    }
}
