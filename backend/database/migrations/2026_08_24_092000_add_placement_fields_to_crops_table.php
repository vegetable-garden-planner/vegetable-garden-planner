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
            $table->unsignedInteger('min_pot_depth_cm')->nullable()->after('plant_spacing_cm');
            $table->string('sun_requirement', 20)->nullable()->after('min_pot_depth_cm');
            $table->boolean('needs_support')->default(false)->after('sun_requirement');
        });

        $catalog = json_decode(
            file_get_contents(database_path('data/crops.json')) ?: '',
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($catalog['crops'] as $crop) {
            DB::table('crops')->where('id', $crop['id'])->update([
                'min_pot_depth_cm' => $crop['minPotDepthCm'],
                'sun_requirement' => $crop['sunRequirement'],
                'needs_support' => $crop['needsSupport'],
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('crops', function (Blueprint $table): void {
            $table->dropColumn(['min_pot_depth_cm', 'sun_requirement', 'needs_support']);
        });
    }
};
