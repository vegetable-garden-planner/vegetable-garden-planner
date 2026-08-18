# 심어봄 프로젝트 작업 가이드

이 파일은 팀원과 AI가 작업을 시작할 때 읽는 단일 진입점입니다. “저장소 문서를 읽고 작업해”라는 요청을 받으면 이 문서부터 읽습니다.

팀원이 AI에게 보낼 기본 요청 예시는 다음과 같습니다.

```text
루트 AGENTS.md와 docs/README.md를 먼저 끝까지 읽어.
현재 코드와 테스트를 확인한 뒤 <할 작업>을 feature 브랜치에서 구현하고,
전체 검증 후 한글 커밋으로 develop에 병합해 줘.
문서와 코드가 다르면 같은 작업에서 문서도 고쳐.
```

## 1. 작업 전 필수 순서

1. 저장소 루트 `AGENTS.md`를 읽습니다.
2. 이 문서를 끝까지 읽습니다.
3. 작업 영역에 맞는 문서만 추가로 읽습니다.
4. `git status --short --branch`로 현재 브랜치와 사용자 변경을 확인합니다.
5. 코드와 테스트에서 실제 구현 상태를 확인합니다. 문서와 코드가 다르면 코드를 기준으로 문서를 함께 수정합니다.

프론트엔드를 수정할 때는 `frontend/AGENTS.md`도 읽습니다. Next.js 버전별 API는 설치된 `frontend/node_modules/next/dist/docs`를 기준으로 확인합니다.

## 2. 기준 문서

| 필요한 정보 | 기준 |
| --- | --- |
| 지금까지 한 일·진행 중 작업·다음 실행 순서 | [HANDOFF.md](HANDOFF.md) |
| 제품 목표와 범위 | [PRODUCT_VISION.md](PRODUCT_VISION.md) |
| 최초 설치·평소 실행 | [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) |
| 계층·데이터·API 규칙 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 안정 브랜치의 구현 상태 | [PROJECT_STATUS.md](PROJECT_STATUS.md) |
| 진행 중·다음 작업과 완료 표시 | [TASKS.md](TASKS.md) |
| 정확한 API 경로와 스키마 | [openapi.yaml](../backend/resources/openapi.yaml), `/api-docs` 및 `backend/routes/api.php` |
| 닷홈 운영 준비 | [DOTHOME_DEPLOYMENT.md](DOTHOME_DEPLOYMENT.md) |
| 화면 디자인 규칙 | `frontend/DESIGN.md`와 `frontend/app/globals.css` |

API 명세와 Laravel 코드가 다르면 실제 라우트·요청 검증·리소스·테스트를 먼저 확인하고 OpenAPI를 같은 작업에서 수정합니다.

디자인 개편이나 이전 작업을 이어받는 경우에는 이 문서를 읽은 직후 `TASKS.md`와 `HANDOFF.md`를 확인합니다. `PROJECT_STATUS.md`는 안정 브랜치의 기능 상태를, `TASKS.md`는 현재 작업 순서를, `HANDOFF.md`는 진행 중 변경의 상세 인계를 설명합니다.

## 3. 절대 혼동하면 안 되는 규칙

- 데이터베이스의 최종 기준은 `backend/database/migrations`입니다.
- phpMyAdmin에서는 빈 DB만 만들고 테이블은 `php artisan migrate`로 생성합니다.
- SQL 스키마 가져오기나 phpMyAdmin 수동 컬럼 추가로 팀 DB 구조를 공유하지 않습니다.
- `.env`, `vendor`, `node_modules`, 비밀번호와 운영 키를 커밋하지 않습니다.
- 브라우저가 DB에 직접 연결하지 않습니다. 모든 사용자 데이터는 Laravel API를 통합니다.
- 사용자 데이터 ID는 UUIDv7, 작물 ID는 의미 있는 slug를 사용합니다.
- 수정·삭제 API는 `version`, `ETag`, `If-Match` 계약을 유지합니다.
- 다른 사용자의 자원 접근은 Laravel 정책과 관계 쿼리에서 차단합니다.
- 오류를 빈 목록이나 성공처럼 숨기지 않습니다.

## 4. 현재 구조

```text
frontend/app                 Next.js 라우트
frontend/features/<domain>   도메인별 화면·규칙·훅·API 클라이언트
frontend/shared              여러 도메인이 실제로 공유하는 코드
backend/routes/api.php       API 라우트
backend/app/Http             요청 검증·컨트롤러·응답 리소스
backend/app/Actions          쓰기 유스케이스와 트랜잭션
backend/app/Models           Eloquent 모델과 관계
backend/database/migrations  유일한 DB 스키마 기준
backend/tests                인증·소유권·경계값·부작용 API 테스트
```

의존 방향과 도메인별 상세 내용은 [ARCHITECTURE.md](ARCHITECTURE.md)를 따릅니다.

## 5. 기능 작업 절차

1. `develop`이 원격과 일치하고 작업 폴더가 깨끗한지 확인합니다.
2. `feature/<기능명>` 브랜치를 만듭니다.
3. [TASKS.md](TASKS.md)의 대상 항목을 즉시 `[-]`로 바꾸고 브랜치 이름을 적습니다.
4. 새 타입·도우미를 만들기 전에 같은 역할의 코드가 있는지 검색합니다.
5. 실패·빈 입력·경계값·다른 사용자 접근·버전 충돌 테스트를 먼저 고려합니다.
6. 백엔드는 Request → Action → Resource 경계를, 프론트엔드는 domain → infrastructure/hooks → components 경계를 유지합니다.
7. 문서·OpenAPI에 영향을 주면 코드와 같은 작업에서 갱신합니다.
8. 관련 테스트 후 전체 테스트·정적 검사·빌드를 실행합니다.
9. 검증을 마치면 작업 항목을 같은 작업에서 즉시 `[x]`로 표시하거나 목록에서 제거합니다.
10. 기능을 설명할 수 있는 단위로 한글 커밋을 작성합니다.
11. 검증된 기능 브랜치를 `develop`에 한글 병합 커밋으로 병합하고 푸시합니다.

사용자가 기존 변경을 남겨 둔 경우 임의로 되돌리거나 덮어쓰지 않습니다.

## 6. 완료 조건

기능 완료는 화면이 보이는 것만 의미하지 않습니다.

- 정상 흐름과 실패 흐름이 모두 동작함
- 입력 경계값과 빈 상태를 검증함
- 사용자 소유권과 인증을 서버에서 검사함
- 저장 변경이 트랜잭션과 버전 계약을 지킴
- 프론트엔드가 서버 오류를 숨기지 않음
- 모바일 레이아웃과 접근 가능한 레이블을 확인함
- 관련 문서와 OpenAPI가 현재 코드와 일치함
- `TASKS.md`에서 완료 항목을 즉시 `[x]`로 표시하거나 제거함
- 아래 검증 명령이 통과함

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

PowerShell 실행 정책이 `npm.ps1`을 막으면 `npm.cmd`, `npx.cmd`를 사용합니다.

## 7. 작업 우선순위 확인

진행 중 작업과 다음 순서는 [TASKS.md](TASKS.md) 한 곳에서 관리합니다. 작업을 끝낼 때는 해당 항목을 즉시 완료 표시하거나 제거해야 합니다.

관리자 작물 편집, 공동 텃밭, 결제, 사진 분석은 핵심 재배 경험과 배포가 안정된 뒤 진행합니다. 안정 브랜치 상태는 [PROJECT_STATUS.md](PROJECT_STATUS.md), 진행 중 변경의 상세 인계는 [HANDOFF.md](HANDOFF.md)를 봅니다.
