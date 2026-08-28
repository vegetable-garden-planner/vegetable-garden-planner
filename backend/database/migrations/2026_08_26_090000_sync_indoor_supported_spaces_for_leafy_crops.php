<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $catalog = json_decode(
            file_get_contents(database_path('data/crops.json')) ?: '',
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($catalog['crops'] as $crop) {
            DB::table('crops')->where('id', $crop['id'])->update([
                'supported_spaces' => json_encode($crop['supportedSpaces'], JSON_THROW_ON_ERROR),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('crops')->where('id', 'lettuce')->update([
            'supported_spaces' => json_encode(['balcony', 'garden'], JSON_THROW_ON_ERROR),
        ]);
        DB::table('crops')->where('id', 'spinach')->update([
            'supported_spaces' => json_encode(['balcony', 'garden'], JSON_THROW_ON_ERROR),
        ]);
    }
};
