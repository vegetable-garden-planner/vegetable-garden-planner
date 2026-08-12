<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminDashboardService;
use Illuminate\View\View;

class AdminDashboardController extends Controller
{
    public function __invoke(AdminDashboardService $dashboard): View
    {
        return view('admin.dashboard', $dashboard->summary());
    }
}
