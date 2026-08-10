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
        Schema::table('users', function (Blueprint $table): void {
            $table->string('nickname', 20)->nullable()->after('name');
            $table->string('role', 20)->default('member')->after('password');
        });

        DB::table('users')->whereNull('nickname')->update([
            'nickname' => DB::raw('name'),
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['nickname', 'role']);
        });
    }
};
