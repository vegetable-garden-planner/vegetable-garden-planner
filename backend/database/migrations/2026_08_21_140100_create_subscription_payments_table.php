<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->string('portone_payment_id', 255)->unique();
            $table->string('status', 20);
            $table->unsignedInteger('amount');
            $table->string('currency', 3)->default('KRW');
            $table->string('failure_reason', 255)->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();

            $table->index('subscription_id', 'subscription_payments_subscription_id_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
    }
};
