# 팀원 로컬 개발환경 설정

이 문서는 팀원이 GitHub 저장소를 처음 받은 뒤 Next.js 프론트엔드와 Laravel 백엔드를 자신의 컴퓨터에서 실행하는 방법을 설명합니다. 아래의 **최초 설정**은 컴퓨터마다 한 번만 수행합니다.

## 1. 준비 프로그램

- Git
- Laragon: PHP 8.2 이상, Composer 2, MySQL 포함
- Node.js와 npm

팀원끼리 PHP와 Node.js의 주요 버전을 맞춥니다. 이 프로젝트의 현재 백엔드는 Laravel 12이며 PHP 8.2 이상이 필요합니다.

명령은 Laragon을 실행한 후 **Laragon > Terminal**에서 입력하는 것을 권장합니다. 일반 PowerShell에서 `php` 또는 `composer`를 찾지 못한다면 Laragon 경로가 PATH에 등록되지 않은 상태입니다.

## 2. GitHub 저장소 받기

원하는 작업 폴더에서 다음 명령을 실행합니다.

```powershell
git clone <저장소-주소>
cd vegetable-garden-planner
```

이미 저장소를 받은 팀원은 다시 clone하지 않고 기존 폴더에서 `git pull`을 사용합니다.

> `composer create-project laravel/laravel backend`는 실행하지 않습니다. Laravel 프로젝트 자체가 이미 GitHub의 `backend`에 포함되어 있습니다.

## 3. Laravel 의존성 설치

```powershell
cd backend
composer install
```

이 명령은 `composer.lock`에 기록된 동일한 버전의 Laravel 패키지를 `backend/vendor`에 설치합니다. `vendor`는 GitHub에 올리지 않으므로 각 컴퓨터에서 생성해야 합니다.

## 4. 개인 환경 파일 생성

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

`.env`에는 개인 DB 접속 정보와 비밀 키가 들어가므로 GitHub에 올리지 않습니다. 팀원마다 자신의 환경에 맞게 다음 값을 확인합니다.

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=vegetable_garden_planner
DB_USERNAME=root
DB_PASSWORD=
```

Laragon의 MySQL root 비밀번호를 따로 설정했다면 `DB_PASSWORD`에 자신의 비밀번호를 입력합니다.

## 5. 개인 로컬 데이터베이스 생성

Laragon에서 MySQL을 시작합니다. 그다음 HeidiSQL 또는 phpMyAdmin에서 다음 이름의 빈 데이터베이스를 만듭니다.

```text
vegetable_garden_planner
```

터미널을 사용하려면 다음 SQL을 MySQL에서 실행해도 됩니다.

```sql
CREATE DATABASE vegetable_garden_planner
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

저장소 루트의 `database/schema.sql`은 Laravel 도입 전 설계 자료입니다. 새 Laravel DB에는 가져오지 않습니다.

## 6. 테이블 생성 및 백엔드 실행

`backend` 디렉터리에서 실행합니다.

```powershell
php artisan migrate
php artisan serve
```

브라우저에서 다음 주소를 열어 상태를 확인합니다.

```text
http://127.0.0.1:8000/api/v1/health
```

정상 응답:

```json
{
  "data": {
    "status": "ok",
    "apiVersion": "v1"
  }
}
```

백엔드 터미널은 개발 중에 계속 켜둡니다.

## 7. 프론트엔드 설치 및 실행

새 Laragon Terminal 또는 PowerShell을 하나 더 열고 저장소의 `frontend`로 이동합니다.

```powershell
cd <저장소를-받은-경로>\vegetable-garden-planner\frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

`frontend/.env.local`의 `BACKEND_URL`은 Laravel 실행 주소와 같아야 합니다. 기본값은 `http://127.0.0.1:8000`입니다. 브라우저는 `/api/v1`과 `/sanctum` 같은 출처 경로로 요청하고 Next.js가 Laravel에 전달하므로, `localhost`와 `127.0.0.1` 차이로 세션 쿠키가 끊기지 않습니다. 주소나 포트를 바꾸면 `BACKEND_URL`만 함께 변경합니다.

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:3000
```

프론트엔드 터미널과 백엔드 터미널은 서로 다른 창에서 실행합니다.

## 8. 평소 공동 작업 흐름

다른 팀원의 변경을 받은 뒤 백엔드 패키지나 마이그레이션이 변경되었을 수 있으므로 다음 순서로 갱신합니다.

```powershell
git pull
cd backend
composer install
php artisan migrate
```

프론트엔드의 `package-lock.json`이 변경되었다면 다음 명령도 실행합니다.

```powershell
cd ..\frontend
npm install
```

DB 컬럼을 직접 추가하고 끝내지 않습니다. 테이블 구조 변경은 `backend/database/migrations`에 새 Laravel 마이그레이션으로 작성해 GitHub로 공유합니다.

## 9. GitHub에 올리지 않는 파일

다음 항목은 각 컴퓨터에서 생성되거나 비밀정보를 포함하므로 커밋하지 않습니다.

```text
backend/.env
backend/vendor/
backend/node_modules/
frontend/node_modules/
로그 파일과 개인 IDE 설정
```

공유해야 하는 설치 명세는 `backend/composer.lock`과 `frontend/package-lock.json`입니다. 두 lock 파일은 반드시 GitHub에 올립니다.

## 10. 자주 발생하는 오류

- `php` 또는 `composer`를 찾을 수 없음: Laragon을 실행하고 Laragon Terminal을 사용합니다.
- `Unknown database`: `vegetable_garden_planner` DB를 먼저 생성합니다.
- `Access denied for user`: `.env`의 DB 계정과 비밀번호를 확인합니다.
- `could not find driver`: Laragon PHP에서 `pdo_mysql` 확장이 활성화됐는지 확인합니다.
- `.env` 변경이 반영되지 않음: `php artisan config:clear`를 실행합니다.
- 이미 존재하는 테이블 오류: 기존 `schema.sql`을 Laravel DB에 함께 가져오지 않았는지 확인합니다.
