<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table): void {
                $table->id();
                $table->unsignedBigInteger('region_id')->nullable();
                $table->string('email')->unique();
                $table->string('password');
                $table->string('nickname', 20);
                $table->string('role', 20)->default('member');
                $table->string('status', 20)->default('active');
                $table->timestamp('email_verified_at')->nullable();
                $table->rememberToken();
                $table->timestamps();
            });
        } else {
            $this->addLaravelUserColumns();
        }

        if (! Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table): void {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (! Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
    }

    private function addLaravelUserColumns(): void
    {
        if (! Schema::hasColumn('users', 'email_verified_at')) {
            Schema::table('users', fn (Blueprint $table) => $table->timestamp('email_verified_at')->nullable());
        }
        if (! Schema::hasColumn('users', 'remember_token')) {
            Schema::table('users', fn (Blueprint $table) => $table->rememberToken());
        }
        if (! Schema::hasColumn('users', 'created_at')) {
            Schema::table('users', fn (Blueprint $table) => $table->timestamp('created_at')->nullable());
        }
        if (! Schema::hasColumn('users', 'updated_at')) {
            Schema::table('users', fn (Blueprint $table) => $table->timestamp('updated_at')->nullable());
        }
    }
};
