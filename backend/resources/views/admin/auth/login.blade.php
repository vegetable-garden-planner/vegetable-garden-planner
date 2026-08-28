<!doctype html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>관리자 로그인 | 심어봄</title>
    <link rel="stylesheet" href="{{ asset('assets/admin.css') }}?v={{ filemtime(public_path('assets/admin.css')) }}">
</head>
<body class="login-page">
<main class="login-card">
    <span class="login-badge">SIM-EOBOM / ADMIN CONSOLE</span>
    <div class="login-logo"><span><img src="{{ asset('brand/logo.png') }}" alt="" width="18" height="18"></span><strong>심어봄 관리자</strong></div>
    <div class="login-form-wrap">
        <h2>관리자 로그인</h2>
        <p class="description">관리자 권한이 부여된 계정만 접근할 수 있습니다.</p>
        <form action="{{ route('admin.login.store') }}" method="post" class="login-form">
            @csrf
            <label for="email">이메일</label>
            <input id="email" name="email" type="email" autocomplete="email" value="{{ old('email') }}" required autofocus>
            <label for="password">비밀번호</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required>
            <label class="remember"><input name="remember" type="checkbox" value="1"> 로그인 상태 유지</label>
            @error('email')<p class="form-error" role="alert">{{ $message }}</p>@enderror
            <button type="submit">관리자 화면으로 이동</button>
        </form>
    </div>
    <p class="login-help">일반 회원은 사용자 웹사이트에서 로그인해 주세요.</p>
</main>
</body>
</html>
