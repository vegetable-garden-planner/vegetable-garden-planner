<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Console\Command;

class PromoteAdmin extends Command
{
    protected $signature = 'admin:promote {email : 관리자 권한을 부여할 기존 회원 이메일}';

    protected $description = '기존 활성 회원에게 관리자 권한을 부여합니다.';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));
        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $this->error('해당 이메일의 회원을 찾을 수 없습니다. 먼저 회원가입을 완료해 주세요.');

            return self::FAILURE;
        }

        if ($user->status !== UserStatus::Active) {
            $this->error('비활성 회원에게는 관리자 권한을 부여할 수 없습니다.');

            return self::FAILURE;
        }

        if ($user->role === UserRole::Admin) {
            $this->info('이미 관리자 계정입니다.');

            return self::SUCCESS;
        }

        if (! $this->confirm("{$user->email} 계정을 관리자로 승격할까요?")) {
            return self::FAILURE;
        }

        $user->forceFill(['role' => UserRole::Admin])->save();
        $this->info('관리자 권한을 부여했습니다.');

        return self::SUCCESS;
    }
}
