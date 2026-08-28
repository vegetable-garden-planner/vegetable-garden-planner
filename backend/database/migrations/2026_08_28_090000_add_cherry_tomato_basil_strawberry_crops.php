<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * 작물 3종 추가 (방울토마토 · 바질 · 딸기)
 *
 * 기준 값은 전부 공개된 자료에서 가져왔다.
 *   방울토마토 : 농사로 토마토·방울토마토 작기 (심는 거리 100×40cm, 유인 필요)
 *   바질       : Utah State University Extension (포기 간격 12인치 ≈ 30cm)
 *   딸기       : 농사로 딸기 텃밭가꾸기 (심는 거리 20cm, 9월 중하순~10월 초순 정식, 12~1월 수확)
 *
 * 자료에 없는 값(바질·딸기의 최소 화분 깊이)은 지어내지 않고 null 로 둔다.
 * 프론트엔드는 null 을 "확인"으로 표시하고 임의의 숫자를 만들지 않는다.
 *
 * 스키마는 바꾸지 않는다. database/data/crops.json 을 그대로 읽어 upsert 하므로
 * 여러 번 실행해도 결과가 같고, 기존 13종의 값도 데이터 파일과 어긋나면 맞춰진다.
 */
return new class extends Migration
{
    /** 이 마이그레이션에서 새로 들어오는 항목 */
    private const NEW_SOURCE_IDS = [
        'nongsaro-cherry-tomato-schedule',
        'nongsaro-strawberry-home-garden',
        'usu-basil-guide',
    ];

    private const NEW_CROP_IDS = ['cherry-tomato', 'basil', 'strawberry'];

    /** crops.id 를 참조하는 테이블과 컬럼 */
    private const CROP_REFERENCES = [
        ['growing_seasons', 'featured_crop_id'],
        ['garden_layout_placements', 'crop_id'],
        ['cultivation_tasks', 'crop_id'],
        ['watering_schedules', 'crop_id'],
        ['container_placements', 'crop_id'],
        ['space_memos', 'crop_id'],
    ];

    public function up(): void
    {
        $catalog = $this->catalog();

        DB::table('crop_sources')->upsert(
            array_map(
                static fn (array $source): array => [
                    'id' => $source['id'],
                    'organization' => $source['organization'],
                    'title' => $source['title'],
                    'url' => $source['url'],
                    'reviewed_at' => $source['reviewedAt'],
                ],
                $catalog['sources'],
            ),
            ['id'],
            ['organization', 'title', 'url', 'reviewed_at'],
        );

        DB::table('crops')->upsert(
            array_map(
                static fn (array $crop): array => [
                    'id' => $crop['id'],
                    'source_id' => $crop['sourceId'],
                    'name' => $crop['name'],
                    'family_name' => $crop['familyName'],
                    'category' => $crop['category'],
                    'difficulty' => $crop['difficulty'],
                    'planting_material' => $crop['plantingMaterial'],
                    'supported_spaces' => json_encode($crop['supportedSpaces'], JSON_THROW_ON_ERROR),
                    'planting_period' => json_encode($crop['plantingPeriod'], JSON_THROW_ON_ERROR),
                    'harvest_period' => json_encode($crop['harvestPeriod'], JSON_THROW_ON_ERROR),
                    'plant_spacing_cm' => $crop['plantSpacingCm'],
                    'min_pot_depth_cm' => $crop['minPotDepthCm'],
                    'sun_requirement' => $crop['sunRequirement'],
                    'needs_support' => $crop['needsSupport'],
                    'summary' => $crop['summary'],
                    'care_guide' => isset($crop['careGuide'])
                        ? json_encode($crop['careGuide'], JSON_THROW_ON_ERROR)
                        : null,
                ],
                $catalog['crops'],
            ),
            ['id'],
            [
                'source_id', 'name', 'family_name', 'category', 'difficulty', 'planting_material',
                'supported_spaces', 'planting_period', 'harvest_period', 'plant_spacing_cm',
                'min_pot_depth_cm', 'sun_requirement', 'needs_support', 'summary', 'care_guide',
            ],
        );
    }

    public function down(): void
    {
        // 사용자의 배치·기록이 참조하고 있을 수 있으므로, 참조가 없을 때만 지운다.
        foreach (self::NEW_CROP_IDS as $cropId) {
            if (! $this->isCropUsed($cropId)) {
                DB::table('crops')->where('id', $cropId)->delete();
            }
        }

        foreach (self::NEW_SOURCE_IDS as $sourceId) {
            if (! DB::table('crops')->where('source_id', $sourceId)->exists()) {
                DB::table('crop_sources')->where('id', $sourceId)->delete();
            }
        }
    }

    private function isCropUsed(string $cropId): bool
    {
        foreach (self::CROP_REFERENCES as [$table, $column]) {
            if (DB::table($table)->where($column, $cropId)->exists()) {
                return true;
            }
        }

        return false;
    }

    /** @return array{sources: array<int, array<string, mixed>>, crops: array<int, array<string, mixed>>} */
    private function catalog(): array
    {
        return json_decode(
            file_get_contents(database_path('data/crops.json')) ?: '',
            true,
            flags: JSON_THROW_ON_ERROR,
        );
    }
};
