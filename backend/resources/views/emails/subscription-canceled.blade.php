<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <title>프로 요금제 구독 해지 안내</title>
</head>
<body style="font-family: -apple-system, sans-serif; color: #1f2937; line-height: 1.6;">
    <p>{{ $user->nickname }}님, 안녕하세요.</p>
    <p>등록된 카드로 결제를 3회 시도했지만 모두 실패해 프로 요금제 구독이 자동으로 해지되었어요.</p>
    <p>카드 상태를 확인하신 뒤 새 카드로 다시 구독하실 수 있습니다.</p>
    <p><a href="{{ $appUrl }}">요금제 페이지에서 다시 구독하기</a></p>
</body>
</html>
