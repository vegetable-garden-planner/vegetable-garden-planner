<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\ChangeMemberStatus;
use App\Domain\Seasons\BuildSeasonSummary;
use App\Enums\GrowingSeasonStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\Crop;
use App\Models\CultivationRecord;
use App\Models\GrowingSeason;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
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

    public function show(User $user): View
    {
        $user->load([
            'socialAccounts',
            'growingSpaces' => fn ($query) => $query->latest(),
            'growingSpaces.seasons' => fn ($query) => $query->latest('start_date'),
            'growingSpaces.seasons.layout.placements',
            'growingSpaces.seasons.tasks' => fn ($query) => $query->latest('due_date'),
            'growingSpaces.seasons.records' => fn ($query) => $query->latest('occurred_at'),
        ]);

        /** @var Collection<int, GrowingSeason> $seasons */
        $seasons = $user->growingSpaces->flatMap->seasons;

        // ponytail: 시즌마다 요약 쿼리를 다시 돈다. 관리자 1인이 보는 화면이라 그대로 둔다.
        $summaries = $seasons->mapWithKeys(
            static fn (GrowingSeason $season): array => [$season->id => BuildSeasonSummary::for($season)],
        );

        $cropIds = $seasons
            ->flatMap(static fn (GrowingSeason $season) => $season->layout?->placements->pluck('crop_id') ?? [])
            ->merge($seasons->pluck('featured_crop_id'))
            ->filter()
            ->unique();

        return view('admin.users.show', [
            'user' => $user,
            'cropNames' => Crop::query()->whereIn('id', $cropIds)->pluck('name', 'id'),
            'summaries' => $summaries,
            'seasonCount' => $seasons->count(),
            'activeSeasons' => $summaries->where('status', GrowingSeasonStatus::Active)->count(),
            'placedCells' => $seasons->sum(static fn (GrowingSeason $season): int => $season->layout?->placements->count() ?? 0),
            'lastRecordAt' => CultivationRecord::query()
                ->whereIn('growing_season_id', $seasons->pluck('id'))
                ->max('occurred_at'),
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
