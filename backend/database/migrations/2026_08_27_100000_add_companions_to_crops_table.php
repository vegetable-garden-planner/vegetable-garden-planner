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
        Schema::table('crops', function (Blueprint $table): void {
            $table->json('companions')->nullable()->after('care_guide');
        });

        $catalog = json_decode(
            file_get_contents(database_path('data/crops.json')) ?: '',
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $existingSourceIds = DB::table('crop_sources')->pluck('id')->all();
        $newSources = array_filter(
            $catalog['sources'],
            static fn (array $source): bool => ! in_array($source['id'], $existingSourceIds, true),
        );

        if ($newSources !== []) {
            DB::table('crop_sources')->insert(array_map(
                static fn (array $source): array => [
                    'id' => $source['id'],
                    'organization' => $source['organization'],
                    'title' => $source['title'],
                    'url' => $source['url'],
                    'reviewed_at' => $source['reviewedAt'],
                ],
                array_values($newSources),
            ));
        }

        foreach ($catalog['crops'] as $crop) {
            DB::table('crops')->where('id', $crop['id'])->update([
                'companions' => isset($crop['companions'])
                    ? json_encode($crop['companions'], JSON_THROW_ON_ERROR)
                    : null,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('crops', function (Blueprint $table): void {
            $table->dropColumn('companions');
        });

        DB::table('crop_sources')->whereIn('id', [
            'rda-companion-planting-2018',
            'nongsaro-crop-companion-curation',
        ])->delete();
    }
};
