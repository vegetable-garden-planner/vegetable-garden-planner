# 심어봄 작업 인계서

기준일: 2026-08-18

이 문서는 새 팀원이나 AI가 이전 대화를 보지 않아도 현재 상태를 파악하고 바로 작업을 이어가기 위한 실행 중심 문서입니다. 작업을 시작할 때는 [프로젝트 작업 가이드](README.md)를 먼저 읽고, 그다음 이 문서를 읽습니다.

## 1. 한눈에 보는 현재 상태

- 안정 기준 브랜치: `develop`
- 문서 작성 시점의 안정 커밋: `f5fec07 병합: 재배 공간 관리 화면 디자인 통일`
- 프론트 운영: https://vegetable-garden-planner.vercel.app
- 백엔드 운영: https://yjwest9.dothome.co.kr
- 운영 API 상태 확인: https://yjwest9.dothome.co.kr/api/v1/health
- 프론트 Production 브랜치: `develop`
- 프론트 Root Directory: `frontend`
- 백엔드 배포: 닷홈에 FileZilla로 변경 파일을 직접 업로드하는 수동 방식
- DB 스키마 단일 기준: `backend/database/migrations`

현재 기능은 회원가입부터 공간·시즌·작물 배치·재배 일정·물주기·재배 기록까지 Laravel API와 MySQL에 연결되어 있습니다. 최근 작업의 중심은 새 기능 추가가 아니라 디자인 시안에 맞춘 기존 화면의 구조·스타일·반응형 통일입니다.

## 2. 반드시 지킬 Git 규칙

1. 작업 전에 `docs/README.md`와 해당 영역 문서를 끝까지 읽습니다.
2. `develop`과 원격이 같은지 확인한 뒤 기능마다 새 `feature/*` 브랜치를 만듭니다.
3. 원격에 같은 이름의 브랜치가 있을 수 있으므로 시작점을 명시합니다.

   ```powershell
   git switch develop
   git pull --ff-only origin develop
   git switch -c feature/<고유한-기능명> origin/develop
   ```

4. 기능·정리·병합 커밋 메시지는 모두 한글로 작성합니다.
5. 관련 검증과 전체 검증을 통과한 뒤 `--no-ff`로 `develop`에 병합하고 push합니다.
6. 병합된 로컬 기능 브랜치는 삭제합니다.
7. `feature/yj-work`와 `origin/feature/yj-work`는 팀원 작업 브랜치이므로 수정·병합·삭제하지 않습니다.
8. `origin/feature/growing-space-design-refresh`는 이미 존재하며 디자인 원본 이미지 커밋을 포함한 원격 브랜치입니다. 같은 이름으로 새 브랜치를 만들면 Git이 해당 원격 브랜치를 시작점으로 추정할 수 있으므로 재사용하거나 임의로 수정하지 않습니다.
9. 사용자의 기존 변경이나 팀원 커밋을 임의로 되돌리지 않습니다.

## 3. 지금까지 완료한 기능

### 인증과 관리자

- Laravel 세션 기반 회원가입·로그인·로그아웃과 회원가입 직후 자동 로그인
- 이메일 중복 확인, 비밀번호 조건과 확인 검증
- Google 소셜 로그인 및 Kakao 확장 구조
- 관리자 별도 로그인, 운영 대시보드, 회원 관리, 작물 기준정보·출처 확인

### 재배 공간과 시즌

- 실내 화분, 베란다, 마당·텃밭 공간 CRUD
- 카카오 주소 검색과 현재 위치 사용
- 위도·방향을 이용한 예상 직사광 시간 계산
- 공간별 시즌 CRUD, 기간·중복 검증
- 화분·베란다 대표 작물 선택과 지원 공간 검증

### 공간 유형별 핵심 흐름

- 마당·텃밭: 시즌 생성 → 격자 생성 → 작물 배치 → 재배 일정 생성
- 화분·베란다: 시즌 생성과 대표 작물 선택 → 격자 없이 재배 일정 생성
- 화분·베란다가 격자 URL에 직접 접근하면 텃밭 전용 기능임을 설명하고 작물 선택 또는 일정 생성으로 이동
- 화분·베란다에 격자를 다시 적용하지 않습니다.

### 일정과 기록

- 작물 기준정보와 권장 심기·수확 시기 표시
- 텃밭 격자 배치, 간격·예상 포기 수·연작 위험 안내
- 작물별 재배 일정 자동 생성과 완료·되돌리기·수정·삭제
- 물주기 일정 CRUD, 완료·미루기·완료 취소와 이력
- 작업·성장 관찰·수확·물주기 시즌 기록 CRUD
- 대시보드 일정 알림과 공간 유형에 맞는 다음 단계 안내

## 4. 완료된 디자인 개편

디자인 기준은 [프론트 디자인 시스템](../frontend/DESIGN.md)입니다. 원본 시안의 핵심은 짙은 온실 사진, 에메랄드 포인트, 따뜻한 흰색 배경, 얇은 경계, 둥근 카드, 긴 세로 스크롤 구성입니다.

| 영역 | 상태 | develop 병합 커밋 |
| --- | --- | --- |
| 대시보드 재배 계획 구조 | 완료 | `41f84fb` |
| 단일 시즌 대시보드 여백 보정 | 완료 | `70fc5ac` |
| 작물 배치 상세 작업 화면 | 완료 | `d8a6e5e` |
| 재배 일정 화면 | 완료 | `1f6cda2` |
| 재배 공간 목록·등록·수정 | 완료 | `f5fec07` |

완료 화면은 기존 API 기능을 유지하면서 데스크톱과 모바일 레이아웃을 모두 확인했습니다. 공간 화면까지의 마지막 전체 검증 결과는 다음과 같습니다.

- 프론트엔드 테스트: 122개 통과
- 백엔드 테스트: 110개, 729 assertions 통과
- TypeScript 타입 검사 통과
- ESLint 통과
- Pint 통과
- Next.js 프로덕션 빌드 통과

## 5. 현재 진행 중인 작업

작업 브랜치: `feature/codex-growing-season-design-refresh`

목표: 시즌 목록·등록·수정 화면을 공간 관리 화면과 같은 디자인 언어로 통일합니다.

현재 로컬 변경 대상:

- `frontend/app/seasons/page.tsx`
- `frontend/app/seasons/new/page.tsx`
- `frontend/app/seasons/[seasonId]/edit/page.tsx`
- `frontend/features/growing-season/components/season-list.tsx`
- `frontend/features/growing-season/components/season-form.tsx`
- `frontend/features/growing-season/components/season-field.tsx`
- `frontend/features/growing-season/components/season-editor.tsx`
- `frontend/features/growing-season/components/growing-season.module.css` 신규

현재까지 구현한 내용:

- 시즌 목록 상단 현황 요약과 진행 중·예정 수치
- 시즌별 2열 계획 카드와 공간·기간·재배 방식 표시
- 공간 유형에 맞는 다음 단계 CTA와 배치·일정·물주기·기록 바로가기
- 단계 번호가 있는 시즌 등록·수정 폼
- 데스크톱 입력 요약 사이드바와 모바일 단일 열 구조
- 공간·시즌 데이터 로딩 상태를 명시적으로 처리
- `SeasonForm`의 데이터 처리와 렌더링을 분리해 ESLint 복잡도 한도 준수

현재 확인된 검증:

- `npm.cmd run typecheck` 통과
- `npm.cmd run lint` 통과
- `git diff --check` 통과

아직 하지 않은 일:

1. 시즌 목록과 폼의 데스크톱·모바일 시각 QA 완료
2. QA에서 발견한 간격·넘침·순서 문제 수정
3. 임시 미리보기 라우트를 만들었다면 커밋 전에 삭제
4. `frontend/DESIGN.md`에 Season management 규칙 추가
5. 프론트 122개·백엔드 110개 전체 테스트, 타입 검사, ESLint, Pint, Next 빌드 재실행
6. 한글 기능 커밋 후 `develop` 병합·push
7. 병합된 시즌 기능 브랜치 삭제

중요: 이 인계 문서를 `develop`에 반영하는 동안 위 시즌 변경은 stash로 임시 보관했다가 같은 브랜치에 복원합니다. 작업을 이어받을 때 먼저 `git status --short --branch`와 `git stash list`를 확인하고, 변경이 이미 작업 폴더에 복원되어 있으면 다시 `stash pop`하지 않습니다.

## 6. 남은 디자인 작업 순서

시즌 화면을 끝낸 뒤 아래 순서로 기능별 별도 브랜치에서 진행합니다.

1. 물주기 일정과 완료·미루기·이력 화면
2. 시즌 재배 기록 목록·등록·수정 화면
3. 작물 목록·검색·필터와 작물 상세 화면
4. 로그인·회원가입 화면의 최종 시안 정렬
5. 시작 진단과 요금제 화면
6. 공통 빈 상태·오류·로딩·삭제 확인·모바일 내비게이션 최종 통일
7. 회원가입 → 기록까지 실제 브라우저 E2E 점검

작은 UI 작업을 DB나 API 변경으로 확대하지 않습니다. 화면에서 필요한 데이터가 이미 있으면 프론트 구조와 CSS만 수정합니다. 실제 서버 기능이 없는 알림·결제·사진 업로드를 디자인만으로 동작하는 기능처럼 표시하지 않습니다.

## 7. 디자인 방향

- 요약 화면: 사진 또는 짙은 숲색 현황 패널을 상단에 두고 핵심 수치를 오른쪽에 배치합니다.
- 관리 화면: 따뜻한 흰색 배경, 얇은 경계, 에메랄드 CTA, 20~24px 반경의 카드로 구성합니다.
- 데스크톱: 정보와 작업을 2~3열로 나누되 제목이나 설명을 덮는 절대 배치를 사용하지 않습니다.
- 모바일: 모든 최소 너비를 해제하고 핵심 입력·작업을 먼저 보여 준 뒤 요약·보조 정보를 아래에 둡니다.
- 빈 상태: 오류처럼 빨간 문구만 보여 주지 않고, 사용자가 무엇을 먼저 해야 하는지와 이동 버튼을 제공합니다.
- 작물 이미지: `public/figma`의 기존 사진을 우선 사용합니다. 없는 작물은 카테고리 색과 한글 첫 글자로 대체하며 임의의 외부 이미지를 추가하지 않습니다.
- 이모지 아이콘과 임의 SVG path를 추가하지 않습니다.
- 화분·베란다에는 격자 UI를 적용하지 않습니다.
- 원본 디자인의 영문 회사 정보·가짜 SNS·가짜 기능은 그대로 복제하지 않고 실제 심어봄 정보와 기능으로 치환합니다.

## 8. 코드 작업 원칙

- 새 유틸·타입·도우미를 만들기 전에 동일 역할이 있는지 `rg`로 검색합니다.
- 도메인 규칙은 `features/<domain>/domain`, API 통신은 `infrastructure`, 서버 상태는 `hooks`, 화면은 `components` 경계를 유지합니다.
- 오류를 빈 배열이나 성공 상태로 숨기지 않습니다.
- `as any`, `as unknown`, 빈 `catch`, 내부 구현을 과도하게 mock한 테스트를 추가하지 않습니다.
- 복잡도와 중첩을 줄이기 위해 guard clause와 작은 렌더링 컴포넌트를 사용합니다.
- 임시 미리보기 라우트와 로컬 스크린샷은 커밋하지 않습니다.
- 사용자 기능 동작을 바꾸지 않은 디자인 작업은 기존 행동 테스트를 유지하고 전체 회귀 검증으로 확인합니다.

## 9. 전체 검증 명령

```powershell
cd backend
php artisan test
vendor\bin\pint --test

cd ..\frontend
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build

cd ..
git diff --check
git status --short --branch
```

현재 Next.js 빌드에는 `metadataBase`가 없다는 비차단 경고가 있습니다. 빌드 실패는 아니며 별도 메타데이터 작업에서 해결합니다.

## 10. 배포와 운영 주의

- `develop` push 후 Vercel 프론트가 자동 배포됩니다.
- 닷홈 백엔드는 자동 배포가 아닙니다.
- 백엔드 변경이 없으면 FileZilla 업로드나 운영 마이그레이션을 하지 않습니다.
- 백엔드 변경이 있으면 로컬 테스트 후 변경 파일만 업로드하고, 필요한 경우 일회용 실행 파일로 `config:clear`와 `migrate --force`를 실행한 뒤 즉시 삭제합니다.
- 운영 수정 전에 DB 백업과 대상 파일 목록을 확인합니다.
- 운영 `.env`, `public/index.php` 경로 구성과 비밀키를 Git 파일로 덮어쓰지 않습니다.

## 11. 다음 AI가 바로 실행할 순서

1. `docs/README.md`, 이 문서, `frontend/AGENTS.md`, `frontend/DESIGN.md`를 끝까지 읽습니다.
2. `git status --short --branch`, `git log -5 --oneline`, `git stash list`를 확인합니다.
3. 시즌 변경이 작업 폴더에 있으면 그대로 이어가고, stash에만 있으면 정확한 메시지를 확인한 뒤 한 번만 복원합니다.
4. 시즌 컴포넌트와 CSS의 현재 diff를 읽고 API 동작이 유지되는지 확인합니다.
5. 임시 preview route로 데스크톱 1440px과 모바일 390px을 확인하되 커밋 전에 삭제합니다.
6. 전체 검증 후 한글 커밋과 병합 커밋으로 `develop`에 반영합니다.
7. 시즌 브랜치를 삭제하고 다음 디자인 영역을 새 고유 브랜치에서 시작합니다.
