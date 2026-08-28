<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documentation;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use RuntimeException;

final class ShowOpenApiSpecificationController extends Controller
{
    public function __invoke(): Response
    {
        $specificationPath = resource_path('openapi.yaml');

        if (! is_file($specificationPath)) {
            throw new RuntimeException('OpenAPI 명세 파일이 없습니다.');
        }

        $specification = file_get_contents($specificationPath);

        if ($specification === false) {
            throw new RuntimeException('OpenAPI 명세 파일을 읽을 수 없습니다.');
        }

        return response($specification, 200, [
            'Cache-Control' => 'public, max-age=300',
            'Content-Disposition' => 'inline; filename="openapi.yaml"',
            'Content-Type' => 'application/yaml; charset=UTF-8',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
