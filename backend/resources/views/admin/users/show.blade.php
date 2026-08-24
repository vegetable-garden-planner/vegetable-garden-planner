@extends('layouts.admin')

@php
    $spaceTypes = ['indoor' => '실내', 'balcony' => '베란다', 'garden' => '마당·텃밭'];
    $sunlights = ['low' => '일조 부족', 'partial' => '반나절 햇빛', 'full' => '온종일 햇빛'];
    $seasonStatuses = ['planned' => '예정', 'active' => '진행 중', 'completed' => '종료'];
    $recordTypes = ['work' => '작업', 'growth' => '성장', 'harvest' => '수확', 'watering' => '물주기'];
@endphp

@section('title', $user->nickname . ' 회원 상세')
@section('eyebrow', 'MEMBER DETAIL')
@section('heading', $user->nickname . ' 회원의 재배 현황')
@section('description', '이 회원이 어떤 공간에서 무엇을 키우고 어떻게 배치했는지 확인합니다.')

@section('content')
<section class="metrics" aria-label="회원 재배 지표">
    <article class="metric primary"><span>재배 공간</span><strong>{{ number_format($user->growingSpaces->count()) }}</strong><small>{{ $user->created_at->format('Y.m.d') }} 가입</small></article>
    <article class="metric"><span>전체 시즌</span><strong>{{ number_format($seasonCount) }}</strong><small>진행 중 {{ number_format($activeSeasons) }}개</small></article>
    <article class="metric"><span>배치된 칸</span><strong>{{ number_format($placedCells) }}</strong><small>텃밭 격자에 심은 작물 수</small></article>
    <article class="metric"><span>연결 소셜 계정</span><strong>{{ number_format($user->socialAccounts->count()) }}</strong><small>{{ $user->socialAccounts->pluck('provider')->join(', ') ?: '이메일 가입' }}</small></article>
    <article class="metric"><span>마지막 기록</span><strong>{{ $lastRecordAt ? \Illuminate\Support\Carbon::parse($lastRecordAt)->format('m.d') : '–' }}</strong><small>{{ $lastRecordAt ? \Illuminate\Support\Carbon::parse($lastRecordAt)->format('Y.m.d H:i') : '아직 남긴 기록이 없습니다' }}</small></article>
</section>

<div class="dashboard-grid">
    <section class="panel">
        <div class="section-head">
            <div><p class="eyebrow">SPACES &amp; SEASONS</p><h2>공간별 재배 내역</h2></div>
            <a href="{{ route('admin.users.index') }}">← 회원 목록</a>
        </div>

        @forelse ($user->growingSpaces as $space)
            <article class="space-block">
                <header>
                    <div><strong>{{ $space->name }}</strong><small>{{ $spaceTypes[$space->type->value] }} · {{ $space->width_cm }}×{{ $space->length_cm }}cm · {{ $sunlights[$space->sunlight->value] }}</small></div>
                    <span class="muted">시즌 {{ $space->seasons->count() }}개</span>
                </header>

                @if (trim($space->notes) !== '')
                    <details class="notes-block" open>
                        <summary>공간 메모</summary>
                        <ul class="note-list"><li class="note-body">{{ $space->notes }}</li></ul>
                    </details>
                @endif

                @forelse ($space->seasons as $season)
                    @php
                        $summary = $summaries[$season->id];
                        $placements = $season->layout?->placements ?? collect();
                        $placementsByCell = $placements->keyBy('cell_index');
                        $cropCounts = $placements->countBy('crop_id')->sortDesc();
                        $seasonNotes = collect();
                        if (trim($season->notes) !== '') {
                            $seasonNotes->push(['tag' => '시즌', 'body' => $season->notes]);
                        }
                        foreach ($season->tasks as $task) {
                            if (trim($task->notes) !== '') {
                                $seasonNotes->push(['tag' => '일정: ' . $task->title, 'body' => $task->notes]);
                            }
                        }
                        foreach ($season->records as $record) {
                            if (trim($record->notes) !== '') {
                                $seasonNotes->push(['tag' => '기록: ' . $recordTypes[$record->type->value], 'body' => $record->notes]);
                            }
                        }
                        foreach ($season->wateringSchedules as $wateringSchedule) {
                            foreach ($wateringSchedule->logs as $log) {
                                if (trim((string) $log->memo) !== '') {
                                    $seasonNotes->push([
                                        'tag' => '물주기: ' . ($cropNames[$wateringSchedule->crop_id] ?? $wateringSchedule->crop_id),
                                        'body' => $log->memo,
                                    ]);
                                }
                            }
                        }
                    @endphp
                    <dl class="operations-list season-block">
                        <div>
                            <dt>{{ $season->name }} <span class="status {{ $summary->status->value }}">{{ $seasonStatuses[$summary->status->value] }}</span></dt>
                            <dd>{{ $season->start_date->format('Y.m.d') }} – {{ $season->end_date->format('Y.m.d') }}</dd>
                        </div>
                        <div>
                            <dt>키우는 작물</dt>
                            <dd>
                                @if ($cropCounts->isNotEmpty())
                                    {{ $cropCounts->map(fn ($count, $cropId) => ($cropNames[$cropId] ?? $cropId) . ' ' . $count . '포기')->join(', ') }}
                                @elseif ($season->featured_crop_id)
                                    {{ $cropNames[$season->featured_crop_id] ?? $season->featured_crop_id }} (대표 작물)
                                @else
                                    <span class="muted">선택한 작물 없음</span>
                                @endif
                            </dd>
                        </div>
                        <div>
                            <dt>텃밭 배치</dt>
                            <dd>
                                @if ($season->layout)
                                    {{ $season->layout->columns }}×{{ $season->layout->rows }}칸 중 {{ $placements->count() }}칸 사용 ({{ $season->layout->cell_size_cm }}cm 격자)
                                @else
                                    <span class="muted">격자 배치 없음</span>
                                @endif
                            </dd>
                        </div>
                        <div>
                            <dt>재배 일정</dt>
                            <dd>{{ $summary->taskCompleted }} / {{ $summary->taskTotal }}건 완료</dd>
                        </div>
                        <div>
                            <dt>재배 기록</dt>
                            <dd>
                                @if (array_sum($summary->recordCounts) > 0)
                                    {{ collect($summary->recordCounts)->filter()->map(fn ($count, $type) => $recordTypes[$type] . ' ' . $count)->join(' · ') }}
                                @else
                                    <span class="muted">기록 없음</span>
                                @endif
                            </dd>
                        </div>
                        <div>
                            <dt>누적 수확량</dt>
                            <dd>
                                @if ($summary->harvestTotals)
                                    {{ collect($summary->harvestTotals)->map(fn ($total) => rtrim(rtrim(number_format($total['quantity'], 2), '0'), '.') . $total['unit'])->join(', ') }}
                                @else
                                    <span class="muted">수확 기록 없음</span>
                                @endif
                            </dd>
                        </div>
                    </dl>

                    @if ($season->layout && $placements->isNotEmpty())
                        <div class="crop-grid-wrap">
                            <div class="crop-grid" style="grid-template-columns: repeat({{ $season->layout->columns }}, 22px)">
                                @for ($cell = 0; $cell < $season->layout->columns * $season->layout->rows; $cell++)
                                    @php $cellPlacement = $placementsByCell->get($cell); @endphp
                                    <span
                                        class="crop-grid-cell"
                                        data-filled="{{ $cellPlacement ? 1 : 0 }}"
                                        title="{{ (intdiv($cell, $season->layout->columns) + 1) }}행 {{ ($cell % $season->layout->columns) + 1 }}열 · {{ $cellPlacement ? ($cropNames[$cellPlacement->crop_id] ?? $cellPlacement->crop_id) : '빈 칸' }}"
                                    >{{ $cellPlacement ? mb_substr($cropNames[$cellPlacement->crop_id] ?? $cellPlacement->crop_id, 0, 1) : '' }}</span>
                                @endfor
                            </div>
                            <p class="crop-grid-legend">
                                @foreach ($cropCounts as $cropId => $count)
                                    <span><i></i>{{ mb_substr($cropNames[$cropId] ?? $cropId, 0, 1) }} = {{ $cropNames[$cropId] ?? $cropId }}</span>
                                @endforeach
                            </p>
                        </div>
                    @endif

                    @if ($seasonNotes->isNotEmpty())
                        <details class="notes-block" open>
                            <summary>메모 {{ $seasonNotes->count() }}건</summary>
                            <ul class="note-list">
                                @foreach ($seasonNotes as $note)
                                    <li><span class="note-tag">{{ $note['tag'] }}</span><span class="note-body">{{ $note['body'] }}</span></li>
                                @endforeach
                            </ul>
                        </details>
                    @endif
                @empty
                    <p class="empty">이 공간에는 아직 시즌이 없습니다.</p>
                @endforelse
            </article>
        @empty
            <p class="empty">이 회원은 아직 재배 공간을 만들지 않았습니다.</p>
        @endforelse
    </section>

    <section class="panel">
        <div class="section-head"><div><p class="eyebrow">ACCOUNT</p><h2>계정 정보</h2></div></div>
        <dl class="operations-list">
            <div><dt>닉네임</dt><dd>{{ $user->nickname }}</dd></div>
            <div><dt>이메일</dt><dd>{{ $user->email }}</dd></div>
            <div><dt>권한</dt><dd><span class="role {{ $user->role->value }}">{{ $user->role->value === 'admin' ? '관리자' : '일반 회원' }}</span></dd></div>
            <div><dt>상태</dt><dd><span class="status {{ $user->status->value }}">{{ $user->status->value === 'active' ? '활성' : '비활성' }}</span></dd></div>
            <div><dt>가입일</dt><dd>{{ $user->created_at->format('Y.m.d H:i') }}</dd></div>
            <div><dt>회원 ID</dt><dd><small>{{ $user->id }}</small></dd></div>
        </dl>

        @if ($user->role->value === 'admin')
            <p class="muted" style="margin-top:18px">관리자 계정은 콘솔에서 상태를 바꿀 수 없습니다.</p>
        @else
            <form
                action="{{ route('admin.users.status', $user) }}"
                method="post"
                style="margin-top:18px"
                @if ($user->status->value === 'active')
                    onsubmit="return confirm('{{ $user->nickname }}({{ $user->email }}) 회원을 탈퇴 처리할까요?\n로그인과 API 토큰이 즉시 차단됩니다. 재배 데이터는 삭제되지 않고 그대로 보관됩니다.')"
                @endif
            >
                @csrf @method('patch')
                <input type="hidden" name="status" value="{{ $user->status->value === 'active' ? 'disabled' : 'active' }}">
                <button class="status-action {{ $user->status->value }}" type="submit">{{ $user->status->value === 'active' ? '이 회원 탈퇴 처리' : '탈퇴 철회(다시 활성화)' }}</button>
            </form>
            <p class="muted" style="margin-top:10px">탈퇴 처리하면 로그인과 API 토큰이 즉시 차단됩니다. 재배 데이터는 삭제되지 않고 그대로 보관되며, 필요하면 다시 활성화할 수 있습니다.</p>
        @endif
    </section>
</div>
@endsection
