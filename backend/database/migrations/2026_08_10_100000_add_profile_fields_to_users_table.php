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
        if (! Schema::hasColumn('users', 'nickname')) {
            Schema::table('users', fn (Blueprint $table) => $table->string('nickname', 20)->nullable());
        }
        if (! Schema::hasColumn('users', 'role')) {
            Schema::table('users', fn (Blueprint $table) => $table->string('role', 20)->default('member'));
        }
        if (! Schema::hasColumn('users', 'status')) {
            Schema::table('users', fn (Blueprint $table) => $table->string('status', 20)->default('active'));
        }

        DB::table('users')->whereNull('nickname')->update(['nickname' => '새싹']);
    }

    public function down(): void
    {
        // The legacy MySQL schema owns these columns, so rollbacks preserve them.
    }
};
