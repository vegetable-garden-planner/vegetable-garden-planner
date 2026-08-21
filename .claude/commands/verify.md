---
description: 백엔드와 프론트엔드 전체 검증을 실행하고 결과를 요약한다
disable-model-invocation: true
---

저장소 전체 검증을 실행한다. 아래 순서를 그대로 따르고, 중간에 실패해도 멈추지 말고 끝까지 실행한 뒤 한 번에 보고한다.

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

PowerShell 실행 정책이 `npm.ps1`을 막으면 `npm.cmd`, `npx.cmd`를 쓴다.

마지막으로 다음도 확인한다.

```
git diff --check
git status --short --branch
```

## 보고 형식

명령별로 통과·실패만 한 줄씩 적고, 실패한 것만 원인을 설명한다. 통과한 명령의 출력을 길게 붙여넣지 않는다.

```
php artisan test      통과 (118개, 780 assertions)
vendor\bin\pint       통과
npm test              통과 (123개)
npm run typecheck     실패 — features/billing/domain/plan-policy.ts:12 …
npm run lint          통과
npm run build         통과
git diff --check      깨끗함
```

## 중요

실패를 발견해도 **이 커맨드에서 코드를 고치지 마라.** 무엇이 왜 실패했는지 보고하고, 어떻게 고칠지 제안한 다음 사용자의 판단을 기다린다. `metadataBase` 관련 Next.js 경고는 알려진 비차단 경고이므로 실패로 세지 않는다.
