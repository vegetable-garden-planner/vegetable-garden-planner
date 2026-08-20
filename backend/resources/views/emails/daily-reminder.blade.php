<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <title>오늘 심어봄에서 확인할 일</title>
</head>
<body style="font-family: -apple-system, sans-serif; color: #1f2937; line-height: 1.6;">
    <p>{{ $user->nickname }}님, 안녕하세요.</p>
    <p>오늘 확인이 필요한 재배 일정과 물주기가 있어요.</p>

    @if ($tasks->isNotEmpty())
        <h3>재배 일정</h3>
        <ul>
            @foreach ($tasks as $task)
                <li>{{ $task->title }} — {{ $task->due_date->format('Y-m-d') }}</li>
            @endforeach
        </ul>
    @endif

    @if ($schedules->isNotEmpty())
        <h3>물주기</h3>
        <ul>
            @foreach ($schedules as $schedule)
                <li>{{ $schedule->crop->name }} 물주기 — {{ $schedule->next_watering_at->format('Y-m-d') }}</li>
            @endforeach
        </ul>
    @endif

    <p><a href="{{ $appUrl }}">심어봄에서 확인하기</a></p>
</body>
</html>
