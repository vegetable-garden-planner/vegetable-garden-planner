# 심어봄

초보자가 자신의 공간에 맞는 작물을 선택하고, 텃밭 배치·재배 일정·물주기·성장 기록을 관리하는 웹 서비스입니다.

## 작업 시작

사람과 AI 모두 작업 전에 반드시 [프로젝트 작업 가이드](docs/README.md)를 먼저 읽습니다. 이전 작업을 이어갈 때는 [현재 작업 인계서](docs/HANDOFF.md)를 이어서 확인하고, 최초 설치는 [로컬 개발환경 설정](docs/LOCAL_DEVELOPMENT.md)을 따릅니다.

```text
Next.js 16 frontend → Laravel 12 API → MySQL/MariaDB
```

중요: 새 데이터베이스에는 SQL 스키마 파일을 가져오지 않습니다. 빈 `vegetable_garden_planner` 데이터베이스를 만든 뒤 `backend`에서 `php artisan migrate`를 실행합니다.

## 디렉터리

- `frontend`: Next.js 화면, 도메인 계산, Laravel API 클라이언트
- `backend`: Laravel API, 인증·인가, 데이터 저장과 마이그레이션
- `docs`: 현재 제품·구조·상태·배포 문서와 OpenAPI 명세

## 빠른 검증

```powershell
cd backend
php artisan test
vendor\bin\pint --test

cd ..\frontend
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## 운영 주소

- 프론트엔드: https://vegetable-garden-planner.vercel.app
- 백엔드 API: https://yjwest9.dothome.co.kr
- API 상태 확인: https://yjwest9.dothome.co.kr/api/v1/health

프론트는 `develop` push 후 Vercel에서 자동 배포됩니다. 닷홈 백엔드는 자동 배포가 아니므로 백엔드 변경 파일만 FileZilla로 수동 업로드합니다.
