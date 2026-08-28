<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class ApiDocumentationTest extends TestCase
{
    public function test_anyone_can_open_the_api_documentation_page(): void
    {
        $response = $this->get('/api-docs');

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8')
            ->assertSee('심어봄 API 문서')
            ->assertSee('api-docs\\/openapi.yaml', false);
    }

    public function test_openapi_route_serves_the_single_source_specification(): void
    {
        $specification = file_get_contents(resource_path('openapi.yaml'));

        self::assertIsString($specification);

        $response = $this->get('/api-docs/openapi.yaml');

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'application/yaml; charset=UTF-8')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertContent($specification);
    }
}
