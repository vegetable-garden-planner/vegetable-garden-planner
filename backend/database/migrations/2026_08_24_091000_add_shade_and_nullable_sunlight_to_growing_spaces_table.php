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
            $table->string('shade_level', 20)->nullable()->after('orientation');
            $table->string('sunlight', 20)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('growing_spaces', function (Blueprint $table): void {
            $table->dropColumn('shade_level');
            $table->string('sunlight', 20)->nullable(false)->change();
        });
    }
};
