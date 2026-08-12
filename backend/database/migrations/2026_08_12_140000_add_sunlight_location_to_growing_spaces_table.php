<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('growing_spaces', function (Blueprint $table): void {
            $table->string('address', 255)->nullable()->after('region');
            $table->decimal('latitude', 10, 7)->nullable()->after('address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->string('orientation', 20)->nullable()->after('longitude');
            $table->decimal('estimated_sunlight_hours', 3, 1)->nullable()->after('orientation');
        });
    }

    public function down(): void
    {
        Schema::table('growing_spaces', function (Blueprint $table): void {
            $table->dropColumn([
                'address',
                'latitude',
                'longitude',
                'orientation',
                'estimated_sunlight_hours',
            ]);
        });
    }
};
