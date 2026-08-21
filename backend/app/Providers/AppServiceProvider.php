<?php

namespace App\Providers;

use App\Services\Billing\PaymentGateway;
use App\Services\Billing\PortOneGateway;
use App\Services\Notifications\PushNotifier;
use App\Services\Notifications\WebPushNotifier;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PushNotifier::class, WebPushNotifier::class);
        $this->app->bind(PaymentGateway::class, PortOneGateway::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
