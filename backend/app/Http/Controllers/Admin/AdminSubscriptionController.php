<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class AdminSubscriptionController extends Controller
{
    public function index(Request $request): View
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(SubscriptionStatus::class)],
        ]);

        $subscriptions = Subscription::query()
            ->with(['user', 'payments' => fn ($query) => $query->latest()])
            ->when(
                isset($filters['status']),
                fn ($query) => $query->where('status', $filters['status']),
            )
            ->orderByRaw('status = ? desc', [SubscriptionStatus::PastDue->value])
            ->latest('current_period_end')
            ->paginate(20)
            ->withQueryString();

        return view('admin.subscriptions.index', [
            'subscriptions' => $subscriptions,
            'status' => $filters['status'] ?? '',
            'metrics' => [
                'active' => Subscription::query()->where('status', SubscriptionStatus::Active)->count(),
                'pastDue' => Subscription::query()->where('status', SubscriptionStatus::PastDue)->count(),
                'canceled' => Subscription::query()->where('status', SubscriptionStatus::Canceled)->count(),
            ],
        ]);
    }
}
