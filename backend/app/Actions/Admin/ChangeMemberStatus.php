<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ChangeMemberStatus
{
    public function execute(User $actor, User $member, UserStatus $status): User
    {
        if ($actor->is($member)) {
            throw new RuntimeException('현재 로그인한 관리자 계정은 변경할 수 없습니다.');
        }

        return DB::transaction(function () use ($member, $status): User {
            $lockedMember = User::query()->lockForUpdate()->findOrFail($member->id);

            if ($lockedMember->role === UserRole::Admin) {
                throw new RuntimeException('다른 관리자 계정은 이 화면에서 변경할 수 없습니다.');
            }

            $lockedMember->forceFill(['status' => $status])->save();

            if ($status === UserStatus::Disabled) {
                DB::table('sessions')->where('user_id', $lockedMember->id)->delete();
                $lockedMember->tokens()->delete();
            }

            return $lockedMember;
        });
    }
}
