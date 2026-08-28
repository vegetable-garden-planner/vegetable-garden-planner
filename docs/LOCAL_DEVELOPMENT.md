# 팀원 로컬 개발환경 설정

이 문서는 저장소를 처음 받은 팀원이 Next.js와 Laravel을 실행하는 정확한 절차입니다. 컴퓨터마다 최초 한 번 설정합니다.

## 1. 준비 프로그램

- Git
- Laragon: PHP 8.2 이상, Composer 2, MySQL 또는 MariaDB
- Node.js와 npm

PHP와 Composer 명령은 Laragon을 실행한 뒤 Laragon Terminal에서 사용하는 것을 권장합니다.

## 2. 저장소 받기

```powershell
git clone <저장소-주소>
cd vegetable-garden-planner
```

이미 받은 저장소는 다시 clone하지 않고 기존 폴더에서 `git pull`을 사용합니다. `composer create-project`도 실행하지 않습니다. Laravel 프로젝트는 `backend`에 이미 포함되어 있습니다.

## 3. Laravel 설치

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

`backend/.env`에서 자신의 MySQL 접속값을 확인합니다.

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=vegetable_garden_planner
DB_USERNAME=root
DB_PASSWORD=

KAKAO_REST_API_KEY=선택_카카오_REST_API_키
KAKAO_CLIENT_SECRET=선택_카카오_클라이언트_시크릿
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=선택_Google_OAuth_클라이언트_ID
GOOGLE_CLIENT_SECRET=선택_Google_OAuth_클라이언트_비밀키
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

GEMINI_API_KEY=선택_Gemini_API_키
GEMINI_MODELS=gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash-lite,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-2.5-flash,gemini-3.1-pro-preview
```

외부 키가 없어도 기본 이메일 로그인과 수동 일조 시간 선택은 동작합니다. 주소 검색은 카카오 REST API 키, Google 로그인은 Google OAuth 키, 카카오 로그인은 카카오 REST API 키·클라이언트 시크릿·등록된 리디렉션 URI가 있어야 실제 외부 서비스까지 완료됩니다. 카카오 로그인은 Kakao Developers의 동의 항목에서 닉네임과 이메일을 제공하도록 설정합니다. `POST /ai/chat`의 정해진 3가지 질문(물주기 시기·잎 노래짐·햇빛 부족) 외의 자유 텍스트 질문에 실제로 답하려면 `GEMINI_API_KEY`가 있어야 합니다 — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)에서 무료로 발급하며, 무료 등급 한도는 계정마다 달라 [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit)에서 직접 확인합니다. 키가 없으면 이 3가지 질문 외에는 항상 "답변을 가져오지 못했어요" 안내만 나옵니다(에러가 아니라 의도된 동작). `GEMINI_MODELS`에 쉼표로 나열한 순서대로 시도하며, 앞 모델의 할당량이 초과(429)되면 자동으로 다음 모델로 넘어갑니다 — 기본값은 무료 등급이 있는 텍스트 생성 모델을 한도가 넉넉한 순서대로 최대한 나열해둔 것이라 보통 안 바꿔도 됩니다.

## 4. 빈 데이터베이스 만들기

Laragon에서 MySQL을 시작하고 HeidiSQL 또는 phpMyAdmin에서 다음 이름의 빈 데이터베이스만 만듭니다.

```text
vegetable_garden_planner
```

권장 문자셋은 `utf8mb4`, collation은 `utf8mb4_unicode_ci`입니다.

중요: SQL 스키마 파일을 가져오지 않습니다. 현재 테이블 구조는 전부 Laravel 마이그레이션으로 관리합니다.

## 5. 테이블 생성과 백엔드 실행

`backend`에서 실행합니다.

```powershell
php artisan migrate
php artisan serve
```

다음 주소가 `status: ok` JSON을 반환하면 정상입니다.

```text
http://127.0.0.1:8000/api/v1/health
```

백엔드 터미널은 개발 중 계속 켜 둡니다.

### 관리자 화면 사용

먼저 일반 회원 계정을 하나 만든 뒤 `backend`에서 해당 이메일을 관리자로 승격합니다.

```powershell
php artisan admin:promote member@example.com
```

명령의 확인 질문에 `yes`를 입력한 다음 `http://127.0.0.1:8000/admin`에서 같은 이메일과 비밀번호로 로그인합니다. 관리자 화면은 활성 상태인 관리자 계정만 접근할 수 있습니다.

## 6. 프론트엔드 설치와 실행

새 터미널에서 실행합니다.

```powershell
cd <저장소-경로>\vegetable-garden-planner\frontend
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. `frontend/.env.local`의 `BACKEND_URL` 기본값은 `http://127.0.0.1:8000`이며 Next.js가 `/api/v1`과 `/sanctum` 요청을 Laravel로 전달합니다.

### 결제(토스페이먼츠) 테스트 키 설정

`/plans`에서 "프로 구독하기"를 누르면 프론트가 `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`를 읽습니다(`frontend/features/billing/infrastructure/toss-payments-client.ts`). 값이 비어 있으면 카드 등록 창을 열기 전에 "결제 설정(토스페이먼츠 clientKey)이 되어 있지 않습니다."로 막힙니다.

토스페이먼츠는 회원가입·계약 없이 쓸 수 있는 **문서용 테스트 키**를 공개하고 있습니다. 이 키로 자동결제(빌링)까지 테스트할 수 있고 실제 출금은 일어나지 않습니다.

| 위치 | 키 이름 | 값 |
| --- | --- | --- |
| `frontend/.env.local` | `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY` | `test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq` |
| `backend/.env` | `TOSS_PAYMENTS_SECRET_KEY` | `test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R` |

- 두 키는 **반드시 짝으로** 씁니다. 결제위젯용 키(`test_gck_...`/`test_gsk_...`)와 섞으면 토스가 `UNAUTHORIZED_KEY`를 돌려줍니다. 우리 코드는 `payment()` 방식(API 개별 연동)이라 `test_ck_`/`test_sk_` 쌍이 맞습니다.
- `backend/.env`를 고친 뒤에는 `php artisan config:clear`를 실행합니다.
- `NEXT_PUBLIC_*`은 빌드 시점에 번들로 들어가므로, 프로덕션 빌드에서는 값을 바꾼 뒤 다시 빌드해야 합니다.
- `TOSS_PAYMENTS_WEBHOOK_SECURITY_KEY`는 계약한 상점에만 발급됩니다. 비워 두면 웹훅 요청만 서명 검증에서 거부되고, 카드 등록·구독 생성·정기결제 흐름은 정상 동작합니다.
- **테스트용 국내 카드번호는 없습니다.** 토스 문서 기준으로 본인 실제 카드 정보를 입력해도 테스트 환경에서는 돈이 출금되지 않습니다.

근거:
- API 키 규칙: <https://docs.tosspayments.com/reference/using-api/api-keys>
- 회원가입 없이 테스트하기(문서용 테스트 키, 테스트 카드번호 없음): <https://docs.tosspayments.com/blog/how-to-test-toss-payments>
- 자동결제(빌링) 연동 흐름: <https://docs.tosspayments.com/guides/v2/billing/integration>

## 7. 다른 팀원의 변경을 받은 뒤

```powershell
git pull

cd backend
composer install
php artisan migrate

cd ..\frontend
npm.cmd install
```

`composer.lock`이나 `package-lock.json`이 바뀌지 않았다면 설치 명령은 빠르게 끝납니다. 새 마이그레이션은 기존 데이터를 보존하면서 한 번만 적용됩니다.

## 8. DB 구조를 바꿀 때

```powershell
cd backend
php artisan make:migration <변경_설명>
php artisan migrate
```

- phpMyAdmin에서 컬럼을 직접 추가하고 끝내지 않습니다.
- 이미 공유된 마이그레이션 파일을 수정하지 않고 새 파일을 만듭니다.
- 새 마이그레이션과 관련 테스트를 Git으로 공유합니다.
- 운영 DB에서는 `migrate:fresh`를 실행하지 않습니다.

로컬 테스트 DB를 완전히 다시 만들어도 되는 상황에서만 `php artisan migrate:fresh`를 사용합니다.

## 9. 검증 명령

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

## 10. Git에 올리지 않는 파일

- `backend/.env`
- `backend/vendor/`
- `frontend/.env.local`
- `frontend/node_modules/`
- 로그, 개인 IDE 설정, 운영 비밀정보

대신 `backend/.env.example`, `composer.lock`, `frontend/.env.example`, `package-lock.json`은 공유합니다.

## 11. 자주 발생하는 오류

- `php` 또는 `composer`를 찾을 수 없음: Laragon을 실행하고 Laragon Terminal을 사용합니다.
- `Unknown database`: 빈 `vegetable_garden_planner` DB를 먼저 만듭니다.
- `Access denied for user`: `backend/.env`의 계정과 비밀번호를 확인합니다.
- `could not find driver`: Laragon PHP의 `pdo_mysql` 확장을 활성화합니다.
- `.env` 변경이 반영되지 않음: `php artisan config:clear`를 실행합니다.
- `Table already exists`: 수동 SQL 가져오기를 하지 않았는지 확인하고 팀에 알립니다.
- `npm.ps1` 실행 정책 오류: `npm.cmd`와 `npx.cmd`를 사용합니다.
