<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('growing_spaces', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('owner_id')->constrained('users')->restrictOnDelete();
            $table->string('name', 30);
            $table->string('type', 20);
            $table->string('sunlight', 20);
            $table->unsignedInteger('width_cm');
            $table->unsignedInteger('length_cm');
            $table->string('region', 100);
            $table->text('notes');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['owner_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('growing_spaces');
    }
};
