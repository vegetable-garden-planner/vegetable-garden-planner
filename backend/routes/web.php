<?php

use App\Http\Controllers\Admin\AdminAuthController;
use App\Http\Controllers\Admin\AdminCatalogController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Auth\GoogleCallbackController;
use App\Http\Controllers\Auth\GoogleRedirectController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/admin');

Route::get('/admin/login', [AdminAuthController::class, 'create'])->name('admin.login');
Route::post('/admin/login', [AdminAuthController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('admin.login.store');

Route::prefix('admin')->name('admin.')->middleware(['auth', 'admin'])->group(function (): void {
    Route::get('/', AdminDashboardController::class)->name('dashboard');
    Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
    Route::patch('/users/{user}/status', [AdminUserController::class, 'updateStatus'])
        ->name('users.status');
    Route::get('/catalog', AdminCatalogController::class)->name('catalog');
    Route::post('/logout', [AdminAuthController::class, 'destroy'])->name('logout');
});

Route::get('/auth/google/redirect', GoogleRedirectController::class)
    ->middleware('throttle:20,1');
Route::get('/auth/google/callback', GoogleCallbackController::class)
    ->middleware('throttle:20,1');
