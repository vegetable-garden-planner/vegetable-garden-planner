<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SubscriptionCanceledMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly User $user) {}

    public function build(): self
    {
        return $this->subject('결제 실패로 프로 요금제 구독이 해지되었어요')
            ->view('emails.subscription-canceled', [
                'user' => $this->user,
                'appUrl' => rtrim(config('services.frontend.url'), '/').'/plans',
            ]);
    }
}
