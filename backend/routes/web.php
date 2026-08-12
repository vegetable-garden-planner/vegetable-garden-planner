<?php

use App\Http\Controllers\Auth\GoogleCallbackController;
use App\Http\Controllers\Auth\GoogleRedirectController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/auth/google/redirect', GoogleRedirectController::class)
    ->middleware('throttle:20,1');
Route::get('/auth/google/callback', GoogleCallbackController::class)
    ->middleware('throttle:20,1');
