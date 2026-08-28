<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cultivation_records', function (Blueprint $table): void {
            $table->string('photo_path', 255)->nullable()->after('unit');
        });
    }

    public function down(): void
    {
        Schema::table('cultivation_records', function (Blueprint $table): void {
            $table->dropColumn('photo_path');
        });
    }
};
