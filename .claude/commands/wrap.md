---
description: 전체 검증 후 작업 목록을 완료 처리하고 한글 커밋으로 develop에 병합한다
disable-model-invocation: true
---

현재 기능 브랜치의 작업을 마무리한다. 아래 순서를 건너뛰지 마라.

## 1. 검증 먼저

전체 검증을 실행한다.

```
cd backend
php artisan test
vendor\bin\pint --test
cd ..\frontend
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

**하나라도 실패하면 여기서 멈춘다.** 커밋도 병합도 하지 말고 실패 내용을 보고한다. 저장소 규칙상 검증을 통과하기 전에는 작업을 완료로 표시할 수 없다.

## 2. 문서 갱신

- `docs/TASKS.md`: 이번 항목을 `[x]`로 바꾸고 완료일을 적어 "최근 완료"로 옮긴다. 완료 기록은 최대 10개만 유지하고 오래된 것은 지운다. 이후 인계 가치가 없는 항목이면 목록에서 제거한다.
- 기능 상태가 바뀌었으면 `docs/PROJECT_STATUS.md`를 갱신한다.
- 이어받을 사람이 알아야 할 판단이나 남은 위험이 있으면 `docs/HANDOFF.md`에 적는다.
- 화면 디자인 규칙이 생겼으면 `frontend/DESIGN.md`를 갱신한다.
- API를 바꿨으면 `backend/resources/openapi.yaml`을 같은 작업에서 고친다.

해당 없는 문서는 건드리지 않는다.

## 3. 커밋

한글로 쓰고, 기능 변경과 문서 갱신을 나눈다. 저장소의 기존 커밋 스타일을 먼저 `git log --oneline -10`으로 확인하고 맞춘다.

```
기능: <무엇을 했는지 한 문장>
문서: <무엇을 갱신했는지 한 문장>
```

성격이 다른 변경이 섞여 있으면 커밋을 더 쪼갠다.

## 4. 병합 전 확인

병합·push 하기 전에 **무엇을 커밋했고 어떤 브랜치에 어떻게 병합할지 요약해서 보여 주고 사용자의 승인을 받는다.** 승인 후에 진행한다.

```
git switch develop
git merge --no-ff feature/<브랜치> -m "병합: <한 문장>"
git push origin develop
git branch -d feature/<브랜치>
```

## 5. 마지막 보고

- `backend/` 아래 파일을 바꿨다면 **닷홈에 FileZilla로 올려야 할 파일 목록을 상대 경로로 정리해서 알려 준다.** 닷홈은 자동 배포가 아니다. 운영 `.env`와 `public/index.php`는 절대 덮어쓰면 안 되는 파일이라고 함께 알린다.
- 백엔드를 안 바꿨으면 "닷홈 업로드 없음"이라고 명시한다. 프론트는 `develop` push 후 Vercel이 자동 배포한다.
- 임시 QA 라우트나 스크린샷을 만들었다면 커밋 전에 지웠는지 확인한다.
