<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const NEW_SOURCE_ID = 'iowa-state-cut-flower-care';

    private const OLD_SOURCE_ID = 'penn-state-cut-flower-care';

    public function up(): void
    {
        DB::transaction(function (): void {
            DB::table('crop_sources')->updateOrInsert(
                ['id' => self::NEW_SOURCE_ID],
                [
                    'organization' => 'Iowa State University Extension and Outreach',
                    'title' => 'How to Harvest, Condition, and Care for Cut Flowers',
                    'url' => 'https://yardandgarden.extension.iastate.edu/how-to/how-harvest-condition-and-care-cut-flowers',
                    'reviewed_at' => '2026-08-12',
                ],
            );

            DB::table('crops')
                ->where('source_id', self::OLD_SOURCE_ID)
                ->update(['source_id' => self::NEW_SOURCE_ID]);

            DB::table('crop_sources')->where('id', self::OLD_SOURCE_ID)->delete();
        });
    }

    public function down(): void
    {
        DB::transaction(function (): void {
            DB::table('crop_sources')->updateOrInsert(
                ['id' => self::OLD_SOURCE_ID],
                [
                    'organization' => 'Penn State Extension',
                    'title' => 'Give Your Fresh Flowers Some Love',
                    'url' => 'https://extension.psu.edu/give-your-fresh-flowers-some-love',
                    'reviewed_at' => '2026-08-07',
                ],
            );

            DB::table('crops')
                ->where('source_id', self::NEW_SOURCE_ID)
                ->update(['source_id' => self::OLD_SOURCE_ID]);

            DB::table('crop_sources')->where('id', self::NEW_SOURCE_ID)->delete();
        });
    }
};
