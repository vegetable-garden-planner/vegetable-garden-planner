@extends('layouts.admin')

@section('title', '회원 관리')
@section('heading', '회원과 접근 상태를 관리해요')
@section('description', '가입 방식과 재배 공간 현황을 확인하고 문제가 있는 일반 회원의 접근을 제한합니다.')

@section('content')
<section class="panel">
    <form class="filters" method="get" action="{{ route('admin.users.index') }}">
        <label><span>회원 검색</span><input name="search" type="search" value="{{ $search }}" placeholder="이메일 또는 닉네임"></label>
        <label><span>계정 상태</span><select name="status"><option value="">전체 상태</option><option value="active" @selected($status === 'active')>활성</option><option value="disabled" @selected($status === 'disabled')>비활성</option></select></label>
        <button type="submit">검색</button>
        @if ($search !== '' || $status !== '')<a href="{{ route('admin.users.index') }}">초기화</a>@endif
    </form>
</section>

<section class="panel table-panel">
    <div class="section-head"><div><p class="eyebrow">MEMBERS</p><h2>회원 {{ number_format($users->total()) }}명</h2></div><p class="table-note">탈퇴 처리하면 세션과 API 토큰이 즉시 종료됩니다. 재배 데이터는 삭제되지 않습니다.</p></div>
    <div class="table-wrap"><table class="member-table"><thead><tr><th>회원</th><th>권한</th><th>가입 방식</th><th>재배 공간</th><th>가입일</th><th>상태 관리</th></tr></thead><tbody>
    @forelse ($users as $user)
        <tr>
            <td><a class="member-cell" href="{{ route('admin.users.show', $user) }}"><span>{{ mb_substr($user->nickname, 0, 1) }}</span><div><strong>{{ $user->nickname }}</strong><small>{{ $user->email }}</small></div></a></td>
            <td><span class="role {{ $user->role->value }}">{{ $user->role->value === 'admin' ? '관리자' : '일반 회원' }}</span></td>
            <td>{{ $user->social_accounts_count > 0 ? 'Google 연결' : '이메일' }}</td>
            <td>{{ $user->growing_spaces_count }}개</td>
            <td>{{ $user->created_at->format('Y.m.d') }}</td>
            <td>
                @if ($user->role->value === 'admin')
                    <span class="muted">보호된 계정</span>
                @else
                    <form
                        action="{{ route('admin.users.status', $user) }}"
                        method="post"
                        @if ($user->status->value === 'active')
                            onsubmit="return confirm('{{ $user->nickname }} 회원을 탈퇴 처리할까요?')"
                        @endif
                    >
                        @csrf @method('patch')
                        <input type="hidden" name="status" value="{{ $user->status->value === 'active' ? 'disabled' : 'active' }}">
                        <button class="status-action {{ $user->status->value }}" type="submit">{{ $user->status->value === 'active' ? '탈퇴 처리' : '탈퇴 철회' }}</button>
                    </form>
                @endif
            </td>
        </tr>
    @empty
        <tr><td colspan="6" class="empty">조건에 맞는 회원이 없습니다.</td></tr>
    @endforelse
    </tbody></table></div>
    @if ($users->hasPages())
        <nav class="pagination" aria-label="회원 목록 페이지">
            @if ($users->onFirstPage())<span>이전</span>@else<a href="{{ $users->previousPageUrl() }}">이전</a>@endif
            <strong>{{ $users->currentPage() }} / {{ $users->lastPage() }}</strong>
            @if ($users->hasMorePages())<a href="{{ $users->nextPageUrl() }}">다음</a>@else<span>다음</span>@endif
        </nav>
    @endif
</section>
@endsection
