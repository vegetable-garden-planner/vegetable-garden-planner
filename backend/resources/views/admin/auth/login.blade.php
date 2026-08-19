<!doctype html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>관리자 로그인 | 심어봄</title>
    <link rel="stylesheet" href="{{ asset('assets/admin.css') }}">
</head>
<body class="login-page">
<main class="login-card">
    <section class="login-visual">
        <span class="login-badge">SIM-EOBOM OPERATIONS</span>
        <div>
            <p>재배 경험을 안전하게 지키는 곳</p>
            <h1>서비스의 오늘을<br>차분히 살펴봐요.</h1>
        </div>
        <small>회원과 재배 데이터, 기준정보의 상태를 한곳에서 확인합니다.</small>
    </section>
    <section class="login-form-wrap">
        <div class="login-logo"><span><img src="{{ asset('brand/logo.png') }}" alt="" width="26" height="26"></span><strong>심어봄 관리자</strong></div>
        <p class="eyebrow">ADMIN ACCESS</p>
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
        <p class="login-help">일반 회원은 사용자 웹사이트에서 로그인해 주세요.</p>
    </section>
</main>
</body>
</html>
