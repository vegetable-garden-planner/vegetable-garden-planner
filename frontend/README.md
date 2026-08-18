# 심어봄 프론트엔드

Next.js 16 App Router와 React 19로 구현한 심어봄 웹 클라이언트입니다. 전체 작업 규칙과 최초 설치는 [프로젝트 작업 가이드](../docs/README.md)를 먼저 읽습니다.

## 실행

Laravel API를 먼저 `http://127.0.0.1:8000`에서 실행합니다.

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

`http://localhost:3000`을 엽니다. `next.config.ts`가 `/api/v1`과 `/sanctum` 요청을 `BACKEND_URL`의 Laravel 서버로 전달합니다.

## 구조

- `app`: 라우트와 페이지 조합
- `features/<domain>/domain`: 순수 타입·계산·검증
- `features/<domain>/infrastructure`: Laravel API 클라이언트
- `features/<domain>/hooks`: 서버 상태와 화면 상태 연결
- `features/<domain>/components`: 사용자 인터페이스
- `shared`: 여러 도메인이 실제로 공유하는 코드

도메인 구조와 서버 계약은 [현재 아키텍처](../docs/ARCHITECTURE.md)를 따릅니다. 디자인 변경은 `DESIGN.md`, `app/globals.css`, [현재 작업 인계서](../docs/HANDOFF.md)를 함께 확인합니다.

## 검증

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

현재 디자인 개편은 대시보드, 작물 배치 상세, 재배 일정, 재배 공간·시즌·물주기·시즌 기록, 작물 목록·검색·필터·상세, 로그인·회원가입, 시작 진단·요금제 화면까지 반영되었습니다. 정확한 완료 범위와 다음 작업은 `docs/HANDOFF.md`와 `docs/TASKS.md`를 기준으로 확인합니다.

Next.js 코드를 수정하기 전에 `AGENTS.md`와 설치된 `node_modules/next/dist/docs`의 해당 버전 문서를 확인합니다.
