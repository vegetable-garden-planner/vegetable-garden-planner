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
```

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

## 6. 프론트엔드 설치와 실행

새 터미널에서 실행합니다.

```powershell
cd <저장소-경로>\vegetable-garden-planner\frontend
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. `frontend/.env.local`의 `BACKEND_URL` 기본값은 `http://127.0.0.1:8000`이며 Next.js가 `/api/v1`과 `/sanctum` 요청을 Laravel로 전달합니다.

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
