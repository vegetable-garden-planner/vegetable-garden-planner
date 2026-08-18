# 닷홈 Laravel 배포 준비 가이드

이 문서는 `backend` Laravel API를 닷홈 계열 PHP 호스팅에 배포하기 전에 확인할 기준입니다. 실제 메뉴와 제공 기능은 이용 중인 상품에 따라 다르므로 상품 사양을 먼저 확인합니다.

## 0. 현재 심어봄 운영 방식

- 운영 백엔드: https://yjwest9.dothome.co.kr
- 상태 확인: https://yjwest9.dothome.co.kr/api/v1/health
- Swagger UI: https://yjwest9.dothome.co.kr/api-docs
- 현재 상품은 SSH 자동 배포를 사용하지 않습니다.
- 백엔드 변경은 로컬 전체 테스트를 먼저 통과한 뒤 FileZilla로 변경 파일만 직접 업로드합니다.
- 프론트만 변경한 작업은 닷홈에 아무 파일도 올리지 않습니다.
- 운영 `.env`와 닷홈에 맞춰 조정한 `public/index.php`를 로컬 파일로 덮어쓰지 않습니다.
- 마이그레이션이나 설정 캐시 정리가 필요할 때만 일회용 실행 파일을 올리고, 실행 직후 서버에서 삭제합니다.

현재 운영 절차와 다음 작업 상태는 [작업 인계서](HANDOFF.md)를 함께 확인합니다.

Swagger 기능을 배포할 때는 `app/Http/Controllers/Documentation`, `resources/views/api-docs.blade.php`, `resources/openapi.yaml`, `routes/web.php`를 업로드합니다. DB 변경과 마이그레이션은 없습니다. 기존 라우트 캐시를 사용 중이면 업로드 후 `route:clear` 또는 배포 절차의 캐시 정리를 실행하고, `/api-docs`와 `/api-docs/openapi.yaml`을 각각 확인합니다.

## 1. 호스팅에서 반드시 확인할 항목

- PHP 8.2 이상
- OpenSSL, PDO MySQL, Mbstring, Tokenizer, XML, Ctype, JSON, Fileinfo 확장
- 웹 문서 루트를 Laravel의 `backend/public`으로 지정할 수 있는지
- Apache `mod_rewrite`와 `.htaccess` 사용 가능 여부
- MySQL 또는 호환 MariaDB 제공 여부
- SSH와 Composer 사용 가능 여부
- `storage`와 `bootstrap/cache`에 쓰기 권한을 줄 수 있는지
- HTTPS 인증서와 cron 제공 여부

웹 문서 루트를 `public`으로 지정할 수 없는 상품에서는 프로젝트 루트와 `.env`가 외부에 노출될 위험이 있습니다. `index.php`만 임의로 옮기는 방식으로 우회하지 말고, 안전한 문서 루트 구성이 가능한 상품을 선택합니다.

## 2. 권장 도메인 구성

Next.js 프론트엔드와 Laravel API를 분리해서 배포합니다.

```text
https://example.com      -> Next.js 프론트엔드
https://api.example.com  -> Laravel backend/public
```

두 주소는 같은 최상위 도메인을 사용해야 Sanctum SPA 세션 쿠키 구성이 단순합니다. 완전히 다른 도메인을 사용한다면 쿠키의 SameSite 및 서드파티 쿠키 제한을 별도로 검토해야 합니다.

## 3. 운영 환경 변수 예시

실제 값은 서버의 `.env`에만 기록하고 Git에 커밋하지 않습니다.

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.com
FRONTEND_URL=https://example.com

KAKAO_REST_API_KEY=카카오_REST_API_키
GOOGLE_CLIENT_ID=Google_OAuth_클라이언트_ID
GOOGLE_CLIENT_SECRET=Google_OAuth_클라이언트_비밀키
GOOGLE_REDIRECT_URI=https://example.com/auth/google/callback

DB_CONNECTION=mysql
DB_HOST=호스팅에서_제공한_DB_호스트
DB_PORT=3306
DB_DATABASE=호스팅에서_제공한_DB명
DB_USERNAME=호스팅에서_제공한_계정
DB_PASSWORD=호스팅에서_제공한_비밀번호

SESSION_DOMAIN=.example.com
SESSION_SECURE_COOKIE=true
SANCTUM_STATEFUL_DOMAINS=example.com,www.example.com
CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

Google Cloud Console의 승인된 리디렉션 URI에도 `GOOGLE_REDIRECT_URI`와 정확히 같은 HTTPS 주소를 등록합니다. 카카오 REST API 키와 Google 비밀키는 프론트엔드 환경 변수에 넣지 않습니다.

현재 심어봄은 브라우저가 Vercel의 같은 출처 `/api`, `/sanctum`, `/auth`로 요청하고 Next.js가 닷홈 Laravel로 프록시합니다. 따라서 운영 설정은 다음 계약을 사용합니다.

```dotenv
APP_URL=https://yjwest9.dothome.co.kr
FRONTEND_URL=https://vegetable-garden-planner.vercel.app
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
SANCTUM_STATEFUL_DOMAINS=vegetable-garden-planner.vercel.app
CORS_ALLOWED_ORIGINS=https://vegetable-garden-planner.vercel.app
GOOGLE_REDIRECT_URI=https://vegetable-garden-planner.vercel.app/auth/google/callback
```

`SESSION_DOMAIN`을 닷홈 도메인으로 고정하면 Vercel을 통해 전달된 `XSRF-TOKEN`과 세션 쿠키를 브라우저가 저장하지 못합니다. Google OAuth 콜백도 브라우저가 시작한 Vercel 출처로 돌아와야 로그인 전 세션의 state를 이어갈 수 있습니다.

`APP_KEY`는 `php artisan key:generate`로 한 번 생성하고 이후 임의로 바꾸지 않습니다. 키를 바꾸면 기존 암호화 데이터와 세션을 읽을 수 없습니다.

## 4. SSH와 Composer가 있는 경우의 배포 순서

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize
```

배포 후 `storage`와 `bootstrap/cache` 쓰기 권한을 확인하고 다음 주소가 JSON을 반환하는지 검사합니다.

```text
GET https://api.example.com/api/v1/health
```

SSH 또는 Composer가 없다면 로컬에서 만든 `vendor` 업로드와 phpMyAdmin을 통한 스키마 반영이 필요해 배포 오류 가능성이 커집니다. 팀 프로젝트의 장기 운영에는 SSH·Composer·문서 루트 변경을 지원하는 상품을 우선합니다.

SSH가 없는 현재 닷홈 환경에서는 일회용 실행 파일로 `config:clear`와 `migrate --force`를 실행할 수 있습니다. 실행 파일은 필요한 순간에만 `html`에 올리고 실행 직후 반드시 삭제합니다. 환경변수만 바꿔도 이전 설정 캐시가 남아 있다면 `config:clear`가 필요합니다.

## 5. 운영 안전 기준

- `.env`, `vendor`, 업로드 파일을 Git에 커밋하지 않습니다.
- 운영 서버에서 `APP_DEBUG=true`를 사용하지 않습니다.
- 운영 DB에 `migrate:fresh`를 실행하지 않습니다.
- 배포 전 DB를 백업하고, 마이그레이션은 한 번에 한 배포만 실행합니다.
- 프론트엔드에는 DB 비밀번호나 `APP_KEY`를 넣지 않습니다.
- 예약 알림을 구현할 때는 cron이 매분 `php artisan schedule:run`을 실행할 수 있는지 확인합니다.
