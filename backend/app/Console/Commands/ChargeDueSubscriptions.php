<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Billing\ChargeDueSubscriptions as ChargeDueSubscriptionsAction;
use Illuminate\Console\Command;

class ChargeDueSubscriptions extends Command
{
    protected $signature = 'subscriptions:charge-due';

    protected $description = '결제 기한이 도래한 구독을 정기 청구합니다.';

    public function handle(ChargeDueSubscriptionsAction $action): int
    {
        $charged = $action->execute();
        $this->info("{$charged}건의 구독을 청구했습니다.");

        return self::SUCCESS;
    }
}
