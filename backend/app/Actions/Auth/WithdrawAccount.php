<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class WithdrawAccount
{
    public function execute(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);

            $lockedUser->forceFill(['status' => UserStatus::Disabled])->save();

            DB::table('sessions')->where('user_id', $lockedUser->id)->delete();
            $lockedUser->tokens()->delete();
        });
    }
}
