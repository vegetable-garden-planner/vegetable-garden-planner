<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->renameColumn('name', 'nickname');
            $table->string('role', 20)->default(UserRole::Member->value);
            $table->string('status', 20)->default(UserStatus::Active->value)->index();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->renameColumn('nickname', 'name');
            $table->dropIndex(['status']);
            $table->dropColumn(['role', 'status']);
        });
    }
};
