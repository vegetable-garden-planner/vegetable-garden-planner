# 닷홈 Laravel 배포 준비 가이드

이 문서는 `backend` Laravel API를 닷홈 계열 PHP 호스팅에 배포하기 전에 확인할 기준입니다. 실제 메뉴와 제공 기능은 이용 중인 상품에 따라 다르므로 상품 사양을 먼저 확인합니다.

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

## 5. 운영 안전 기준

- `.env`, `vendor`, 업로드 파일을 Git에 커밋하지 않습니다.
- 운영 서버에서 `APP_DEBUG=true`를 사용하지 않습니다.
- 운영 DB에 `migrate:fresh`를 실행하지 않습니다.
- 배포 전 DB를 백업하고, 마이그레이션은 한 번에 한 배포만 실행합니다.
- 프론트엔드에는 DB 비밀번호나 `APP_KEY`를 넣지 않습니다.
- 예약 알림을 구현할 때는 cron이 매분 `php artisan schedule:run`을 실행할 수 있는지 확인합니다.
