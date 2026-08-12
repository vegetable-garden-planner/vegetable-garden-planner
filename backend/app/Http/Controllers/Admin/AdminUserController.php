<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\ChangeMemberStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use RuntimeException;

class AdminUserController extends Controller
{
    public function index(Request $request): View
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(UserStatus::class)],
        ]);

        $search = trim((string) ($filters['search'] ?? ''));

        $users = User::query()
            ->withCount(['growingSpaces', 'socialAccounts'])
            ->when($search !== '', fn ($query) => $query->where(
                fn ($nested) => $nested
                    ->where('email', 'like', "%{$search}%")
                    ->orWhere('nickname', 'like', "%{$search}%"),
            ))
            ->when(isset($filters['status']), fn ($query) => $query->where('status', $filters['status']))
            ->orderByRaw('role = ? desc', [UserRole::Admin->value])
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return view('admin.users.index', [
            'users' => $users,
            'search' => $search,
            'status' => $filters['status'] ?? '',
        ]);
    }

    public function updateStatus(
        Request $request,
        User $user,
        ChangeMemberStatus $changeMemberStatus,
    ): RedirectResponse {
        $validated = $request->validate([
            'status' => ['required', Rule::enum(UserStatus::class)],
        ]);

        try {
            $changeMemberStatus->execute(
                $request->user(),
                $user,
                UserStatus::from($validated['status']),
            );
        } catch (RuntimeException $exception) {
            return back()->withErrors(['status' => $exception->getMessage()]);
        }

        return back()->with('success', "{$user->nickname} 회원의 상태를 변경했습니다.");
    }
}
