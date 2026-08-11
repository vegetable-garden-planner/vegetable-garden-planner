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

도메인 구조와 서버 계약은 [현재 아키텍처](../docs/ARCHITECTURE.md)를 따릅니다. 디자인 변경은 `DESIGN.md`와 `app/globals.css`를 함께 확인합니다.

## 검증

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Next.js 코드를 수정하기 전에 `AGENTS.md`와 설치된 `node_modules/next/dist/docs`의 해당 버전 문서를 확인합니다.
