<!doctype html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', '관리자') | 심어봄</title>
    <link rel="stylesheet" href="{{ asset('assets/admin.css') }}">
</head>
<body>
<div class="admin-shell">
    <aside class="sidebar">
        <a class="brand" href="{{ route('admin.dashboard') }}" aria-label="심어봄 관리자 홈">
            <span class="brand-mark"><img src="{{ asset('brand/logo.png') }}" alt="" width="26" height="26"></span>
            <span><strong>심어봄</strong><small>ADMIN CONSOLE</small></span>
        </a>
        <nav class="nav" aria-label="관리자 메뉴">
            <a class="{{ request()->routeIs('admin.dashboard') ? 'active' : '' }}" href="{{ route('admin.dashboard') }}"><span>⌂</span>운영 대시보드</a>
            <a class="{{ request()->routeIs('admin.users.*') ? 'active' : '' }}" href="{{ route('admin.users.index') }}"><span>◎</span>회원 관리</a>
            <a class="{{ request()->routeIs('admin.catalog') ? 'active' : '' }}" href="{{ route('admin.catalog') }}"><span>▦</span>작물 기준정보</a>
        </nav>
        <div class="sidebar-bottom">
            <p><strong>{{ auth()->user()->nickname }}</strong><span>{{ auth()->user()->email }}</span></p>
            <form action="{{ route('admin.logout') }}" method="post">
                @csrf
                <button class="logout" type="submit">로그아웃</button>
            </form>
        </div>
    </aside>

    <main class="content">
        <header class="topbar">
            <div>
                <p class="eyebrow">@yield('eyebrow', 'SERVICE OPERATIONS')</p>
                <h1>@yield('heading')</h1>
                @hasSection('description')<p class="description">@yield('description')</p>@endif
            </div>
            <div class="today">{{ now()->format('Y.m.d') }}<span>{{ ['일','월','화','수','목','금','토'][now()->dayOfWeek] }}요일</span></div>
        </header>

        @if (session('success'))
            <div class="notice success" role="status">{{ session('success') }}</div>
        @endif
        @if ($errors->any())
            <div class="notice error" role="alert">{{ $errors->first() }}</div>
        @endif

        @yield('content')
    </main>
</div>
</body>
</html>
