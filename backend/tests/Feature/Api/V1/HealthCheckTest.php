<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_health_endpoint_returns_the_public_api_contract(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'status' => 'ok',
                    'apiVersion' => 'v1',
                ],
            ]);
    }

    public function test_local_frontend_origin_can_make_credentialed_requests(): void
    {
        $response = $this
            ->withHeaders([
                'Origin' => 'http://localhost:3000',
                'Access-Control-Request-Method' => 'GET',
            ])
            ->options('/api/v1/health');

        $response
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    public function test_unknown_origin_is_not_allowed_by_cors(): void
    {
        $response = $this
            ->withHeaders([
                'Origin' => 'https://untrusted.example',
                'Access-Control-Request-Method' => 'GET',
            ])
            ->options('/api/v1/health');

        $response
            ->assertNoContent()
            ->assertHeaderMissing('Access-Control-Allow-Origin');
    }
}
