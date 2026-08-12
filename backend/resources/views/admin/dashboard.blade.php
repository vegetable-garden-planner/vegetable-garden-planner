@extends('layouts.admin')

@section('title', '운영 대시보드')
@section('heading', '서비스의 오늘을 살펴봐요')
@section('description', '회원 활동과 재배 운영 상태, 확인이 필요한 항목을 한눈에 모았습니다.')

@section('content')
<section class="metrics" aria-label="핵심 운영 지표">
    <article class="metric primary"><span>전체 회원</span><strong>{{ number_format($metrics['users']) }}</strong><small>최근 7일 +{{ number_format($metrics['newUsers']) }}</small></article>
    <article class="metric"><span>재배 공간</span><strong>{{ number_format($metrics['spaces']) }}</strong><small>회원이 등록한 전체 공간</small></article>
    <article class="metric"><span>진행 시즌</span><strong>{{ number_format($metrics['activeSeasons']) }}</strong><small>오늘이 기간에 포함된 시즌</small></article>
    <article class="metric"><span>미완료 일정</span><strong>{{ number_format($metrics['pendingTasks']) }}</strong><small>회원이 처리해야 할 작업</small></article>
    <article class="metric"><span>7일 활동 기록</span><strong>{{ number_format($metrics['recentRecords']) }}</strong><small>성장·작업·수확 기록</small></article>
</section>

<div class="dashboard-grid">
    <section class="panel alerts-panel">
        <div class="section-head"><div><p class="eyebrow">ACTION REQUIRED</p><h2>확인이 필요한 운영 항목</h2></div></div>
        @php
            $alertItems = [
                ['count' => $alerts['overdueTasks'], 'label' => '기한이 지난 재배 일정', 'hint' => '회원 알림과 일정 상태를 점검하세요.', 'tone' => 'danger'],
                ['count' => $alerts['activeSeasonsWithoutTasks'], 'label' => '일정 없는 진행 시즌', 'hint' => '작물 배치 또는 일정 생성 흐름을 확인하세요.', 'tone' => 'warning'],
                ['count' => $alerts['spacesWithoutLocation'], 'label' => '위치 미설정 공간', 'hint' => '일조량 자동 추정 대상에서 제외됩니다.', 'tone' => 'neutral'],
                ['count' => $alerts['failedJobs'], 'label' => '실패한 백그라운드 작업', 'hint' => '알림·메일 기능 도입 시 우선 점검 대상입니다.', 'tone' => 'danger'],
            ];
        @endphp
        <div class="alert-list">
            @foreach ($alertItems as $item)
            <article class="alert-row {{ $item['count'] > 0 ? $item['tone'] : 'clear' }}">
                <span class="alert-count">{{ number_format($item['count']) }}</span>
                <div><strong>{{ $item['label'] }}</strong><p>{{ $item['count'] > 0 ? $item['hint'] : '현재 확인할 항목이 없습니다.' }}</p></div>
            </article>
            @endforeach
        </div>
    </section>

    <section class="panel operations-panel">
        <div class="section-head"><div><p class="eyebrow">SERVICE DATA</p><h2>데이터 구성 현황</h2></div></div>
        <dl class="operations-list">
            <div><dt>저장된 텃밭 배치</dt><dd>{{ number_format($operations['layouts']) }}</dd></div>
            <div><dt>물주기 일정</dt><dd>{{ number_format($operations['wateringSchedules']) }}</dd></div>
            <div><dt>연결된 소셜 계정</dt><dd>{{ number_format($operations['socialAccounts']) }}</dd></div>
            <div><dt>작물 기준정보</dt><dd>{{ number_format($operations['crops']) }}</dd></div>
            <div><dt>공식 정보 출처</dt><dd>{{ number_format($operations['sources']) }}</dd></div>
        </dl>
        <a class="panel-link" href="{{ route('admin.catalog') }}">작물 기준정보 확인하기 →</a>
    </section>
</div>

<div class="dashboard-grid lower">
    <section class="panel">
        <div class="section-head"><div><p class="eyebrow">NEW MEMBERS</p><h2>최근 가입 회원</h2></div><a href="{{ route('admin.users.index') }}">전체 보기</a></div>
        <div class="table-wrap"><table><thead><tr><th>회원</th><th>가입 방식</th><th>공간</th><th>상태</th></tr></thead><tbody>
        @forelse ($recentUsers as $user)
            <tr><td><strong>{{ $user->nickname }}</strong><small>{{ $user->email }}</small></td><td>{{ $user->social_accounts_count > 0 ? '소셜 연결' : '이메일' }}</td><td>{{ $user->growing_spaces_count }}개</td><td><span class="status {{ $user->status->value }}">{{ $user->status->value === 'active' ? '활성' : '비활성' }}</span></td></tr>
        @empty
            <tr><td colspan="4" class="empty">가입한 회원이 없습니다.</td></tr>
        @endforelse
        </tbody></table></div>
    </section>

    <section class="panel">
        <div class="section-head"><div><p class="eyebrow">RECENT ACTIVITY</p><h2>최근 재배 기록</h2></div></div>
        <div class="activity-list">
        @forelse ($recentRecords as $record)
            <article><span>{{ mb_substr($record->growingSeason?->growingSpace?->owner?->nickname ?? '?', 0, 1) }}</span><div><strong>{{ $record->growingSeason?->growingSpace?->owner?->nickname ?? '알 수 없는 회원' }} · {{ $record->type->value }}</strong><p>{{ $record->growingSeason?->name }} / {{ $record->occurred_at->format('m.d H:i') }}</p></div></article>
        @empty
            <p class="empty">아직 등록된 재배 기록이 없습니다.</p>
        @endforelse
        </div>
    </section>
</div>
@endsection
