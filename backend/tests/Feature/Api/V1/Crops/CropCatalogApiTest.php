<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Crops;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CropCatalogApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_list_the_complete_reference_catalog(): void
    {
        $this->getJson('/api/v1/crops?perPage=100')
            ->assertOk()
            ->assertJsonCount(13, 'data')
            ->assertJsonPath('meta.total', 13)
            ->assertJsonFragment([
                'id' => 'lettuce',
                'name' => '상추',
                'familyName' => '국화과',
                'supportedSpaces' => ['balcony', 'garden'],
                'plantSpacingCm' => 25,
            ]);
    }

    public function test_list_filters_by_category_space_and_search_text(): void
    {
        $this->getJson('/api/v1/crops?category=flower&space=indoor&query=간접광&perPage=100')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => 'moth-orchid'])
            ->assertJsonFragment(['id' => 'african-violet']);
    }

    public function test_list_rejects_invalid_and_unknown_filters(): void
    {
        $this->getJson('/api/v1/crops?category=tree&ownerId=injected')
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['fields' => ['category', 'ownerId']]]);
    }

    public function test_guest_can_read_crop_detail_with_care_guide(): void
    {
        $this->getJson('/api/v1/crops/moth-orchid')
            ->assertOk()
            ->assertJsonPath('data.name', '호접란')
            ->assertJsonPath('data.careGuide.actions.0', '뿌리가 계속 젖어 있지 않도록 물을 준 뒤 완전히 빼 주세요.');
    }

    public function test_missing_crop_returns_standard_not_found_error(): void
    {
        $this->getJson('/api/v1/crops/not-a-crop')
            ->assertNotFound()
            ->assertJsonPath('error.code', 'RESOURCE_NOT_FOUND');
    }

    public function test_guest_can_list_catalog_sources(): void
    {
        $this->getJson('/api/v1/crop-sources')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonFragment([
                'id' => 'nongsaro-beginner-garden-manual',
                'organization' => '농촌진흥청 농사로',
                'reviewedAt' => '2026-08-06',
            ])
            ->assertJsonFragment([
                'id' => 'iowa-state-cut-flower-care',
                'organization' => 'Iowa State University Extension and Outreach',
                'url' => 'https://yardandgarden.extension.iastate.edu/how-to/how-harvest-condition-and-care-cut-flowers',
                'reviewedAt' => '2026-08-12',
            ])
            ->assertJsonMissing(['id' => 'penn-state-cut-flower-care']);
    }
}
