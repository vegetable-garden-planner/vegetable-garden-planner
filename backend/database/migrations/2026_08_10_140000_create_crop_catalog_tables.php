<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crop_sources', function (Blueprint $table): void {
            $table->string('id', 100)->primary();
            $table->string('organization');
            $table->string('title');
            $table->text('url');
            $table->date('reviewed_at');
        });

        Schema::create('crops', function (Blueprint $table): void {
            $table->string('id', 100)->primary();
            $table->string('source_id', 100);
            $table->string('name', 100)->unique();
            $table->string('family_name', 100);
            $table->string('category', 30)->index();
            $table->string('difficulty', 30);
            $table->string('planting_material', 30);
            $table->json('supported_spaces');
            $table->json('planting_period');
            $table->json('harvest_period');
            $table->unsignedInteger('plant_spacing_cm');
            $table->text('summary');
            $table->json('care_guide')->nullable();

            $table->foreign('source_id')->references('id')->on('crop_sources')->restrictOnDelete();
        });

        $catalog = json_decode(
            file_get_contents(database_path('data/crops.json')) ?: '',
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        DB::table('crop_sources')->insert(array_map(
            static fn (array $source): array => [
                'id' => $source['id'],
                'organization' => $source['organization'],
                'title' => $source['title'],
                'url' => $source['url'],
                'reviewed_at' => $source['reviewedAt'],
            ],
            $catalog['sources'],
        ));

        DB::table('crops')->insert(array_map(
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
                'summary' => $crop['summary'],
                'care_guide' => isset($crop['careGuide'])
                    ? json_encode($crop['careGuide'], JSON_THROW_ON_ERROR)
                    : null,
            ],
            $catalog['crops'],
        ));

        Schema::table('growing_seasons', function (Blueprint $table): void {
            $table->foreign('featured_crop_id')->references('id')->on('crops')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('growing_seasons', function (Blueprint $table): void {
            $table->dropForeign(['featured_crop_id']);
        });
        Schema::dropIfExists('crops');
        Schema::dropIfExists('crop_sources');
    }
};
