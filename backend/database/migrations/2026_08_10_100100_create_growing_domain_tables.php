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
        $this->createReferenceTables();
        $this->createOrExtendGardens();
        $this->createOrExtendSeasons();
        $this->createOrExtendLayoutsAndPlantings();
        $this->createOrExtendTasks();
        $this->seedCoreReferences();
    }

    public function down(): void
    {
        // These tables belong to the shared MySQL schema. Rollbacks must not delete them.
    }

    private function createReferenceTables(): void
    {
        if (! Schema::hasTable('climate_zones')) {
            Schema::create('climate_zones', function (Blueprint $table): void {
                $table->id();
                $table->string('name')->unique();
                $table->text('description')->nullable();
            });
        }

        if (! Schema::hasTable('regions')) {
            Schema::create('regions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('climate_zone_id')->constrained('climate_zones');
                $table->string('name')->unique();
            });
        }

        if (! Schema::hasTable('crop_families')) {
            Schema::create('crop_families', function (Blueprint $table): void {
                $table->id();
                $table->string('name')->unique();
                $table->unsignedInteger('rotation_years')->default(3);
            });
        }

        if (! Schema::hasTable('crops')) {
            Schema::create('crops', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('family_id')->constrained('crop_families');
                $table->string('slug', 100)->unique();
                $table->string('name')->unique();
                $table->string('image')->nullable();
                $table->string('difficulty');
                $table->text('description')->nullable();
            });
        } elseif (! Schema::hasColumn('crops', 'slug')) {
            Schema::table('crops', fn (Blueprint $table) => $table->string('slug', 100)->nullable()->unique());
        }
    }

    private function createOrExtendGardens(): void
    {
        if (! Schema::hasTable('gardens')) {
            Schema::create('gardens', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('owner_id')->constrained('users');
                $table->foreignId('region_id')->constrained('regions');
                $table->string('name');
                $table->decimal('width', 10, 2);
                $table->decimal('height', 10, 2);
                $table->decimal('cell_size', 10, 2)->default(25);
                $table->string('environment');
                $table->string('space_type', 20)->default('garden');
                $table->string('sunlight', 20)->default('partial');
                $table->text('notes')->nullable();
                $table->unsignedInteger('version')->default(1);
                $table->timestamps();
            });

            return;
        }

        $this->addColumnIfMissing('gardens', 'space_type', fn (Blueprint $table) => $table->string('space_type', 20)->default('garden'));
        $this->addColumnIfMissing('gardens', 'sunlight', fn (Blueprint $table) => $table->string('sunlight', 20)->default('partial'));
        $this->addColumnIfMissing('gardens', 'notes', fn (Blueprint $table) => $table->text('notes')->nullable());
        $this->addColumnIfMissing('gardens', 'version', fn (Blueprint $table) => $table->unsignedInteger('version')->default(1));
        $this->addTimestampsIfMissing('gardens');
    }

    private function createOrExtendSeasons(): void
    {
        if (! Schema::hasTable('seasons')) {
            Schema::create('seasons', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('garden_id')->constrained('gardens');
                $table->string('name');
                $table->date('start_date');
                $table->date('end_date');
                $table->string('status', 20);
                $table->text('notes')->nullable();
                $table->string('featured_crop_slug', 100)->nullable();
                $table->unsignedInteger('version')->default(1);
                $table->timestamps();
                $table->index(['garden_id', 'start_date', 'end_date']);
            });

            return;
        }

        $this->addColumnIfMissing('seasons', 'notes', fn (Blueprint $table) => $table->text('notes')->nullable());
        $this->addColumnIfMissing('seasons', 'featured_crop_slug', fn (Blueprint $table) => $table->string('featured_crop_slug', 100)->nullable());
        $this->addColumnIfMissing('seasons', 'version', fn (Blueprint $table) => $table->unsignedInteger('version')->default(1));
        $this->addTimestampsIfMissing('seasons');
    }

    private function createOrExtendLayoutsAndPlantings(): void
    {
        if (! Schema::hasTable('layout_versions')) {
            Schema::create('layout_versions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('season_id')->constrained('seasons');
                $table->foreignId('created_by')->constrained('users');
                $table->unsignedInteger('version');
                $table->json('layout_data');
                $table->timestamps();
                $table->unique(['season_id', 'version']);
            });
        } else {
            $this->addTimestampsIfMissing('layout_versions');
        }

        if (! Schema::hasTable('plantings')) {
            Schema::create('plantings', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('season_id')->constrained('seasons');
                $table->foreignId('crop_id')->constrained('crops');
                $table->unsignedInteger('start_x');
                $table->unsignedInteger('start_y');
                $table->unsignedInteger('width')->default(1);
                $table->unsignedInteger('height')->default(1);
            });
        }
    }

    private function createOrExtendTasks(): void
    {
        if (! Schema::hasTable('task_types')) {
            Schema::create('task_types', function (Blueprint $table): void {
                $table->id();
                $table->string('name')->unique();
                $table->string('icon')->nullable();
            });
        }

        if (! Schema::hasTable('tasks')) {
            Schema::create('tasks', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('season_id')->constrained('seasons');
                $table->foreignId('planting_id')->nullable()->constrained('plantings');
                $table->foreignId('task_type_id')->constrained('task_types');
                $table->date('due_date');
                $table->string('status', 20)->default('pending');
                $table->string('title', 100);
                $table->text('notes')->nullable();
                $table->unsignedInteger('version')->default(1);
                $table->timestamps();
                $table->index(['season_id', 'status', 'due_date']);
            });
        } else {
            $this->addColumnIfMissing('tasks', 'title', fn (Blueprint $table) => $table->string('title', 100)->nullable());
            $this->addColumnIfMissing('tasks', 'notes', fn (Blueprint $table) => $table->text('notes')->nullable());
            $this->addColumnIfMissing('tasks', 'version', fn (Blueprint $table) => $table->unsignedInteger('version')->default(1));
            $this->addTimestampsIfMissing('tasks');
        }

        if (! Schema::hasTable('task_completions')) {
            Schema::create('task_completions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('task_id')->constrained('tasks');
                $table->foreignId('user_id')->constrained('users');
                $table->dateTime('completed_at');
                $table->text('memo')->nullable();
            });
        }
    }

    private function seedCoreReferences(): void
    {
        DB::table('climate_zones')->updateOrInsert(
            ['name' => '기타'],
            ['description' => '사용자 입력 지역을 위한 기본 기후 구역'],
        );

        $crops = [
            ['potato', '감자', '가지과', 'normal', '씨감자를 심어 초여름에 수확하는 대표적인 텃밭 작물입니다.'],
            ['lettuce', '상추', '국화과', 'easy', '화분과 텃밭에서 모두 시작하기 쉬운 잎채소입니다.'],
            ['kidney-bean', '강낭콩', '콩과', 'easy', '씨앗으로 바로 심고 지지대를 활용해 기르는 콩과 작물입니다.'],
            ['young-radish', '열무', '배추과', 'easy', '생육 기간이 짧아 작은 구역에서도 빠르게 수확할 수 있습니다.'],
            ['spinach', '시금치', '비름과', 'easy', '줄뿌림 후 솎아주며 기르는 대표적인 잎채소입니다.'],
            ['green-onion', '대파', '수선화과', 'normal', '필요한 만큼 나누어 수확할 수 있는 잎채소입니다.'],
            ['carrot', '당근', '미나리과', 'normal', '깊이가 충분한 흙에서 기르는 뿌리채소입니다.'],
            ['tomato', '토마토', '가지과', 'challenging', '햇빛과 지지대 관리가 필요한 열매채소입니다.'],
            ['cucumber', '오이', '박과', 'challenging', '덩굴 유인과 꾸준한 물 관리가 필요한 작물입니다.'],
            ['pepper', '고추', '가지과', 'normal', '여름 동안 차례로 수확하는 대표 작물입니다.'],
            ['gift-bouquet', '꽃다발', '혼합 절화', 'easy', '선물 받은 꽃을 오래 감상하는 관리 방법을 안내합니다.'],
            ['moth-orchid', '호접란', '난초과', 'normal', '밝은 간접광에서 오래 사는 실내 꽃입니다.'],
            ['african-violet', '아프리칸 바이올렛', '게스네리아과', 'normal', '작은 공간에서 오랫동안 꽃을 볼 수 있는 화분 식물입니다.'],
        ];

        foreach ($crops as [$slug, $name, $familyName, $difficulty, $description]) {
            DB::table('crop_families')->updateOrInsert(
                ['name' => $familyName],
                ['rotation_years' => 3],
            );
            $familyId = DB::table('crop_families')->where('name', $familyName)->value('id');
            DB::table('crops')->updateOrInsert(
                ['slug' => $slug],
                [
                    'family_id' => $familyId,
                    'name' => $name,
                    'difficulty' => $difficulty,
                    'description' => $description,
                ],
            );
        }

        foreach ([
            'watering' => '물',
            'sowing' => '씨',
            'transplanting' => '모',
            'fertilizing' => '비',
            'support' => '지',
            'harvest' => '수',
            'other' => '일',
        ] as $name => $icon) {
            DB::table('task_types')->updateOrInsert(['name' => $name], ['icon' => $icon]);
        }
    }

    private function addColumnIfMissing(string $tableName, string $columnName, callable $definition): void
    {
        if (! Schema::hasColumn($tableName, $columnName)) {
            Schema::table($tableName, $definition);
        }
    }

    private function addTimestampsIfMissing(string $tableName): void
    {
        $this->addColumnIfMissing($tableName, 'created_at', fn (Blueprint $table) => $table->timestamp('created_at')->nullable());
        $this->addColumnIfMissing($tableName, 'updated_at', fn (Blueprint $table) => $table->timestamp('updated_at')->nullable());
    }
};
