<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->unsignedTinyInteger('past_due_retry_count')->default(0)->after('canceled_at');
            $table->dateTime('next_retry_at')->nullable()->after('past_due_retry_count');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropColumn(['past_due_retry_count', 'next_retry_at']);
        });
    }
};
