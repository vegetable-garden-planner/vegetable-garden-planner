<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;

define('LARAVEL_START', microtime(true));

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

header('Content-Type: text/plain; charset=UTF-8');

try {
    $kernel->call('config:clear');
    echo "[설정 캐시 초기화]\n".$kernel->output()."\n";

    $exitCode = $kernel->call('migrate', ['--force' => true]);
    echo "[마이그레이션 실행]\n".$kernel->output()."\n";

    $kernel->call('migrate:status');
    echo "[마이그레이션 상태]\n".$kernel->output()."\n";

    if ($exitCode !== 0) {
        http_response_code(500);
        echo "마이그레이션이 실패했습니다. 위 오류를 확인하세요.\n";
        exit($exitCode);
    }

    echo "완료되었습니다. 지금 FileZilla에서 html/dothome-migrate.php를 삭제하세요.\n";
} catch (Throwable $exception) {
    http_response_code(500);
    echo "실행 실패: {$exception->getMessage()}\n";
}
