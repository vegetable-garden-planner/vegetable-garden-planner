@extends('layouts.admin')

@section('title', '구독 현황')
@section('heading', '프로 요금제 구독을 살펴봐요')
@section('description', '연체·해지 회원과 결제 실패 사유를 확인합니다. 연체는 3일 간격으로 최대 3회 자동 재시도한 뒤 자동 해지됩니다.')

@php
    $statusLabels = ['active' => '활성', 'past_due' => '연체', 'canceled' => '해지'];
@endphp

@section('content')
<section class="metrics" aria-label="구독 핵심 지표">
    <article class="metric primary"><span>활성 구독</span><strong>{{ number_format($metrics['active']) }}</strong></article>
    <article class="metric"><span>연체</span><strong>{{ number_format($metrics['pastDue']) }}</strong></article>
    <article class="metric"><span>해지</span><strong>{{ number_format($metrics['canceled']) }}</strong></article>
</section>

<section class="panel">
    <form class="filters" method="get" action="{{ route('admin.subscriptions.index') }}">
        <label><span>구독 상태</span>
            <select name="status">
                <option value="">전체 상태</option>
                @foreach ($statusLabels as $value => $label)
                    <option value="{{ $value }}" @selected($status === $value)>{{ $label }}</option>
                @endforeach
            </select>
        </label>
        <button type="submit">검색</button>
        @if ($status !== '')<a href="{{ route('admin.subscriptions.index') }}">초기화</a>@endif
    </form>
</section>

<section class="panel table-panel">
    <div class="section-head"><div><p class="eyebrow">SUBSCRIPTIONS</p><h2>구독 {{ number_format($subscriptions->total()) }}건</h2></div></div>
    <div class="table-wrap"><table class="member-table"><thead><tr><th>회원</th><th>상태</th><th>다음 결제일 / 해지일</th><th>재시도</th><th>다음 재시도</th><th>최근 결제 실패 사유</th></tr></thead><tbody>
    @forelse ($subscriptions as $subscription)
        @php $lastFailedPayment = $subscription->payments->firstWhere('status', 'failed'); @endphp
        <tr>
            <td><strong>{{ $subscription->user->nickname }}</strong><br><small>{{ $subscription->user->email }}</small></td>
            <td><span class="status {{ $subscription->status->value }}">{{ $statusLabels[$subscription->status->value] }}</span></td>
            <td>
                @if ($subscription->status->value === 'canceled')
                    {{ $subscription->canceled_at?->format('Y.m.d') }}
                @else
                    {{ $subscription->current_period_end->format('Y.m.d') }}
                @endif
            </td>
            <td>{{ $subscription->past_due_retry_count }} / {{ \App\Actions\Billing\RecordFailedSubscriptionCharge::MAX_RETRY_ATTEMPTS }}</td>
            <td>{{ $subscription->next_retry_at?->format('Y.m.d H:i') ?? '—' }}</td>
            <td>{{ $lastFailedPayment?->failure_reason ?? '—' }}</td>
        </tr>
    @empty
        <tr><td colspan="6" class="empty">조건에 맞는 구독이 없습니다.</td></tr>
    @endforelse
    </tbody></table></div>
    @if ($subscriptions->hasPages())
        <nav class="pagination" aria-label="구독 목록 페이지">
            @if ($subscriptions->onFirstPage())<span>이전</span>@else<a href="{{ $subscriptions->previousPageUrl() }}">이전</a>@endif
            <strong>{{ $subscriptions->currentPage() }} / {{ $subscriptions->lastPage() }}</strong>
            @if ($subscriptions->hasMorePages())<a href="{{ $subscriptions->nextPageUrl() }}">다음</a>@else<span>다음</span>@endif
        </nav>
    @endif
</section>
@endsection
