# 닷홈 Laravel 배포 준비 가이드

이 문서는 `backend` Laravel API를 닷홈 계열 PHP 호스팅에 배포하기 전에 확인할 기준입니다. 실제 메뉴와 제공 기능은 이용 중인 상품에 따라 다르므로 상품 사양을 먼저 확인합니다.

## 0. 현재 심어봄 운영 방식

- 운영 백엔드: https://yjwest9.dothome.co.kr
- 상태 확인: https://yjwest9.dothome.co.kr/api/v1/health
- Swagger UI: https://yjwest9.dothome.co.kr/api-docs
- 현재 Swagger 상태: 닷홈 업로드 완료, `/api-docs`와 `/api-docs/openapi.yaml` 모두 정상 응답. 2026-08-19에 추가한 이메일 중복 확인·소셜 로그인 리디렉션·콜백 명세도 같은 날 재업로드해 반영했습니다.
- 현재 상품은 SSH 자동 배포를 사용하지 않습니다.
- 백엔드 변경은 로컬 전체 테스트를 먼저 통과한 뒤 FileZilla로 변경 파일만 직접 업로드합니다.
- 프론트만 변경한 작업은 닷홈에 아무 파일도 올리지 않습니다.
- 운영 `.env`와 닷홈에 맞춰 조정한 `public/index.php`를 로컬 파일로 덮어쓰지 않습니다.
- 마이그레이션이나 설정 캐시 정리가 필요할 때만 일회용 실행 파일을 올리고, 실행 직후 서버에서 삭제합니다.

현재 운영 절차와 다음 작업 상태는 [작업 인계서](HANDOFF.md)를 함께 확인합니다.

Swagger 배포는 2026-08-18에 완료했습니다. 당시 업로드한 파일은 다음과 같습니다.

- `app/Http/Controllers/Documentation/ShowApiDocumentationController.php`
- `app/Http/Controllers/Documentation/ShowOpenApiSpecificationController.php`
- `resources/views/api-docs.blade.php`
- `resources/openapi.yaml`
- `routes/web.php`

DB 변경과 마이그레이션은 없습니다. 기존 라우트 캐시를 사용 중이면 업로드 후 `route:clear` 또는 배포 절차의 캐시 정리를 실행합니다. `/api-docs/openapi.yaml`이 YAML을 반환하는지 먼저 확인한 다음 `/api-docs`에서 Swagger UI를 확인하고, 두 주소가 모두 정상일 때만 [작업 목록](TASKS.md)의 배포 항목을 완료 처리합니다.

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
KAKAO_CLIENT_SECRET=카카오_클라이언트_시크릿
KAKAO_REDIRECT_URI=https://example.com/auth/kakao/callback
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

Google Cloud Console의 승인된 리디렉션 URI에도 `GOOGLE_REDIRECT_URI`와 정확히 같은 HTTPS 주소를 등록합니다. Kakao Developers의 카카오 로그인 리디렉션 URI에는 `KAKAO_REDIRECT_URI`와 정확히 같은 HTTPS 주소를 등록하고 동의 항목에서 닉네임과 이메일 제공을 활성화합니다. 카카오 REST API 키·클라이언트 시크릿과 Google 비밀키는 프론트엔드 환경 변수에 넣지 않습니다.

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
KAKAO_REDIRECT_URI=https://vegetable-garden-planner.vercel.app/auth/kakao/callback
```

`SESSION_DOMAIN`을 닷홈 도메인으로 고정하면 Vercel을 통해 전달된 `XSRF-TOKEN`과 세션 쿠키를 브라우저가 저장하지 못합니다. Google·카카오 OAuth 콜백도 브라우저가 시작한 Vercel 출처로 돌아와야 로그인 전 세션의 state를 이어갈 수 있습니다.

### 카카오 로그인 변경 파일 수동 업로드

2026-08-19에 아래 11개 파일 업로드와 Kakao Developers 설정을 완료했고, Vercel 로그인 화면에서 카카오 회원가입까지 정상 동작을 확인했습니다. 아래는 그때 따른 절차이자 이후 재배포 시 참고할 기준입니다.

카카오 로그인 기능을 운영에 활성화할 때는 기존 운영 `.env`와 `public/index.php`를 덮어쓰지 말고 다음 변경 파일만 같은 상대 경로로 업로드합니다.

- `app/Actions/Auth/ResolveSocialUser.php`
- `app/Actions/Auth/ResolveGoogleUser.php`
- `app/Actions/Auth/ResolveKakaoUser.php`
- `app/Services/Auth/SocialLoginRedirector.php`
- `app/Services/Auth/KakaoLoginClient.php`
- `app/Http/Controllers/Auth/GoogleRedirectController.php`
- `app/Http/Controllers/Auth/GoogleCallbackController.php`
- `app/Http/Controllers/Auth/KakaoRedirectController.php`
- `app/Http/Controllers/Auth/KakaoCallbackController.php`
- `config/services.php`
- `routes/web.php`

위 11개 파일은 한 번에 올립니다. 카카오 변경은 Google과 카카오가 함께 쓰는 `ResolveSocialUser` 경계를 도입했기 때문에, Google 관련 파일을 빼고 카카오 파일만 올리면 운영에서 기존 Google 로그인이 깨집니다. `routes/web.php`는 Swagger 배포 때 올린 것보다 최신 버전이므로 반드시 다시 올립니다.

운영 `.env`에는 `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`를 직접 추가합니다. 업로드 뒤 `config:clear`와 `route:clear`를 실행하고, Kakao Developers 설정을 마친 다음 Vercel 로그인 화면에서 카카오 인증·신규 가입·기존 이메일 연결·로그아웃을 확인합니다. DB 마이그레이션은 없습니다.

`APP_KEY`는 `php artisan key:generate`로 한 번 생성하고 이후 임의로 바꾸지 않습니다. 키를 바꾸면 기존 암호화 데이터와 세션을 읽을 수 없습니다.

### 로고 교체 변경 파일 수동 업로드

2026-08-19에 아래 파일을 업로드해 `/admin/login`과 `/admin`의 로고 표시를 확인했습니다.

관리자 콘솔의 "싹" 텍스트 로고를 이미지 로고로 바꾸면서 바뀐 백엔드 파일은 다음과 같습니다.

- `public/assets/admin.css`
- `resources/views/layouts/admin.blade.php`
- `resources/views/admin/auth/login.blade.php`
- `public/brand/logo.png` (새 파일, 같은 상대 경로에 `brand` 폴더를 새로 만들어 올립니다)

코드 변경이 없는 정적 파일이라 `config:clear`나 마이그레이션은 필요하지 않습니다. 업로드 후 `/admin/login`과 `/admin`에서 로고가 42px 흰색 원 안에 정상 표시되는지 확인합니다.

### 기록 사진 업로드 변경 파일 수동 업로드

이 기능은 **마이그레이션이 있고 서버에 쓰기 가능한 폴더가 필요합니다.** 지금까지의 업로드와 절차가 다릅니다.

`config/filesystems.php`의 `uploads` 디스크는 `base_path(env('PUBLIC_DIR', 'public').'/uploads')`를 씁니다. 로컬은 웹 루트 폴더명이 `public`이지만 닷홈은 `html`이므로, **운영 `.env`에 `PUBLIC_DIR=html`을 추가하지 않으면 사진이 존재하지도 않는 `public/uploads`에 저장되고 공개 URL이 전부 404가 됩니다.** (`public/index.php`, `bootstrap/app.php`는 닷홈에서도 로컬과 완전히 동일한 파일이라 이 경로 차이를 대신 흡수해 주지 않습니다.)

올릴 파일:

- `database/migrations/2026_08_20_120000_add_photo_path_to_cultivation_records_table.php` (신규)
- `config/filesystems.php` (수정, `uploads` 디스크 추가)
- `routes/api.php` (수정)
- `app/Models/CultivationRecord.php` (수정)
- `app/Actions/Records/ReplaceCultivationRecordPhoto.php` (신규)
- `app/Actions/Records/DeleteCultivationRecord.php` (수정)
- `app/Http/Requests/Api/V1/Records/StoreRecordPhotoRequest.php` (신규)
- `app/Http/Controllers/Api/V1/Records/StoreRecordPhotoController.php` (신규)
- `app/Http/Controllers/Api/V1/Records/DestroyRecordPhotoController.php` (신규)
- `app/Http/Resources/Api/V1/CultivationRecordResource.php` (수정)
- `resources/openapi.yaml` (수정)
- `public/uploads/.htaccess` (신규, `public` 아래에 `uploads` 폴더를 만들고 그 안에 올립니다)

순서:

1. `public/uploads` 폴더를 만들고 FileZilla에서 권한을 `707`(또는 `755`로 안 되면 `777`)로 바꿉니다. 웹 서버가 이 폴더에 파일을 쓸 수 있어야 합니다.
2. `public/uploads/.htaccess`를 올립니다. 이 파일이 없으면 업로드 폴더에서 코드가 실행될 수 있으므로 **사진 기능을 켜기 전에 반드시 먼저 올립니다.**
3. 나머지 파일을 올립니다.
4. 아래 [마이그레이션 실행 스크립트](#마이그레이션-실행-스크립트)로 `migrate --force`를 실행하고, 확인 후 파일을 바로 지웁니다.
5. 같은 스크립트로 `config:clear`를 실행합니다. `config/filesystems.php`가 바뀌었으므로 설정 캐시가 남아 있으면 새 `uploads` 디스크를 못 찾습니다.
6. 새 엔드포인트가 404면 `route:clear`를 실행합니다.
7. 스크립트 파일을 삭제했는지 다시 확인합니다.

#### 마이그레이션 실행 스크립트

SSH가 없으니 브라우저로 artisan을 한 번 실행시키는 방법뿐입니다. 아래 내용을 `_deploy_migrate.php`로 저장해 닷홈의 `html`(=`public`) 폴더에 올립니다.

```php
<?php
// _deploy_migrate.php — 실행하고 결과를 확인한 뒤 서버에서 즉시 삭제한다.
$token = '무작위_문자열로_직접_교체';
$allowed = ['migrate --force', 'config:clear', 'route:clear', 'cache:clear', 'view:clear'];

header('Content-Type: text/plain; charset=utf-8');
if (($_GET['token'] ?? '') !== $token) { http_response_code(403); exit('forbidden'); }
$cmd = $_GET['cmd'] ?? '';
if (!in_array($cmd, $allowed, true)) { http_response_code(400); exit('cmd must be one of: '.implode(', ', $allowed)); }

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$status = Illuminate\Support\Facades\Artisan::call($cmd);
echo "command: {$cmd}\nstatus: {$status}\n\n".Illuminate\Support\Facades\Artisan::output();
```

브라우저 주소창에 순서대로 칩니다. `$token`은 매번 새 무작위 문자열로 바꾸고 Git에 실제 값을 커밋하지 않습니다.

```text
https://yjwest9.dothome.co.kr/_deploy_migrate.php?token=내토큰&cmd=migrate%20--force
https://yjwest9.dothome.co.kr/_deploy_migrate.php?token=내토큰&cmd=config:clear
```

`status: 0`과 마이그레이션 이름이 보이면 성공입니다. **확인하자마자 FileZilla로 `_deploy_migrate.php`를 삭제합니다.** 이 파일이 서버에 남아 있으면 토큰을 아는 사람이 명령을 실행할 수 있습니다.

`migrate --force`는 아직 실행하지 않은 마이그레이션만 적용하므로 여러 번 눌러도 안전합니다. 다만 실행 전 phpMyAdmin에서 DB를 내보내 백업해 둡니다.

### 마이그레이션 롤백

배포한 마이그레이션을 되돌려야 하면 같은 일회용 스크립트의 `$allowed`에 `'migrate:rollback --step=1 --force'`를 추가해 올립니다. `--force`가 없으면 프로덕션 확인 프롬프트에서 비대화형 실행이 그대로 취소됩니다(`WARN Command cancelled`, `status: 1`). `--step` 값은 되돌릴 마이그레이션 개수입니다.

```text
https://yjwest9.dothome.co.kr/_deploy_migrate.php?token=내토큰&cmd=migrate:status
https://yjwest9.dothome.co.kr/_deploy_migrate.php?token=내토큰&cmd=migrate:rollback%20--step=1%20--force
```

`migrate:rollback`은 각 마이그레이션의 `down()`이 실제로 스키마를 되돌릴 때만 안전합니다. 배포 전 마이그레이션의 `down()`을 반드시 확인합니다. 이미 마이그레이션 이후 사용자가 입력한 데이터가 있다면 컬럼을 되돌리면서 데이터가 함께 사라질 수 있으므로, `migrate:rollback`은 최후 수단이 아니라 배포 직후 즉시 되돌리는 용도로만 씁니다. 배포가 오래돼 데이터가 쌓인 뒤에는 롤백 대신 앞으로 가는 수정 마이그레이션을 추가합니다. phpMyAdmin DB 백업은 `migrate:rollback`으로도 복구할 수 없는 경우의 최후 수단입니다.

닷홈과 학교 테스트 서버 양쪽에서 더미 스크래치 마이그레이션으로 백업 → 업로드 → `migrate --force` → `migrate:status` → `migrate:rollback --step=1 --force` → `migrate:status` 전체 절차를 리허설해 정상 동작을 확인했습니다(2026-08-21).

확인할 것:

- 닷홈 PHP 설정의 `upload_max_filesize`와 `post_max_size`가 **6MB 이상**인지 확인합니다. 기본값이 2MB면 5MB 사진이 빈 요청으로 도착해 "사진 파일을 선택해 주세요"만 뜹니다. 호스팅 관리 화면에서 못 바꾸면 `public/.htaccess`에 다음을 추가합니다.

  ```apache
  <IfModule mod_php.c>
      php_value upload_max_filesize 6M
      php_value post_max_size 8M
  </IfModule>
  ```

- 사진을 한 장 올린 뒤 `https://yjwest9.dothome.co.kr/uploads/records/<파일명>`이 이미지로 열리는지 확인합니다.
- 백업 대상에 `public/uploads`를 포함합니다. 이 폴더는 Git에 없으므로 지우면 복구할 수 없습니다.

### 웹 푸시 알림 변경 파일 수동 업로드

이 기능은 **`composer require`로 새 패키지(`minishlink/web-push`)를 추가했고 마이그레이션이 있습니다.** 닷홈은 Composer를 쓸 수 없으므로 로컬에서 만든 `vendor` 전체를 다시 업로드해야 합니다(부분 업로드로는 `vendor/composer/autoload_*.php`가 새 패키지를 못 찾습니다).

올릴 파일:

- `vendor/` 전체 (재업로드)
- `database/migrations/2026_08_21_130000_create_push_subscriptions_table.php` (신규)
- `app/Models/PushSubscription.php` (신규)
- `app/Models/User.php` (수정, `pushSubscriptions` 관계 추가)
- `app/Actions/Notifications/SavePushSubscription.php`, `DeletePushSubscription.php` (신규)
- `app/Actions/Notifications/SendDailyReminders.php` (수정, 메일과 함께 푸시도 보낸다)
- `app/Http/Requests/Api/V1/Notifications/`, `app/Http/Controllers/Api/V1/Notifications/` 전체 (신규)
- `app/Services/Notifications/PushNotifier.php`, `WebPushNotifier.php` (신규)
- `app/Providers/AppServiceProvider.php` (수정, `PushNotifier` 바인딩)
- `config/services.php` (수정, `web_push` 설정 추가)
- `routes/api.php` (수정)
- `resources/openapi.yaml` (수정)

운영 `.env`에 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`를 추가합니다. 로컬 `.env`에 이미 만들어 둔 값을 그대로 쓰지 말고 운영용 키를 새로 생성합니다(`php artisan tinker --execute="print_r(Minishlink\WebPush\VAPID::createVapidKeys());"`, 프론트 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`도 같은 공개키로 맞춥니다). Windows 로컬에서 이 명령이 `Unable to create the key`로 실패하면 PHP의 OpenSSL이 `openssl.cnf`를 못 찾는 것이라 `OPENSSL_CONF` 환경변수로 PHP 설치 경로의 `extras/ssl/openssl.cnf`를 가리켜야 한다 — 닷홈 Linux 서버에서는 보통 필요 없다.

업로드 뒤 [마이그레이션 실행 스크립트](#마이그레이션-실행-스크립트)로 `migrate --force`와 `config:clear`를 실행합니다. 새 엔드포인트가 404면 `route:clear`도 실행합니다. 실제 발송은 기존 `notifications:send-daily-reminders` cron에 얹혀 있으므로 별도 cron 등록은 필요 없습니다 — [5번](#5-운영-안전-기준)의 스케줄러·큐 cron이 이미 있어야 합니다.

### 프로 요금제 결제 인프라(포트원) 변경 파일 수동 업로드

이 기능도 **마이그레이션이 있고**, 서명 검증 외에는 새 PHP 패키지를 추가하지 않았으므로 `vendor` 재업로드는 필요 없습니다.

올릴 파일:

- `database/migrations/2026_08_21_140000_create_subscriptions_table.php`, `2026_08_21_140100_create_subscription_payments_table.php` (신규)
- `app/Enums/SubscriptionStatus.php`, `SubscriptionPaymentStatus.php` (신규)
- `app/Models/Subscription.php`, `SubscriptionPayment.php` (신규)
- `app/Models/User.php` (수정, `subscription` 관계 추가)
- `app/Services/Billing/` 전체 (신규 — `PaymentGateway`, `PortOneGateway`, `PaymentChargeResult`)
- `app/Actions/Billing/` 전체 (신규)
- `app/Http/Requests/Api/V1/Billing/`, `app/Http/Controllers/Api/V1/Billing/` 전체 (신규)
- `app/Http/Resources/Api/V1/SubscriptionResource.php` (신규)
- `app/Policies/SubscriptionPolicy.php` (신규)
- `app/Console/Commands/ChargeDueSubscriptions.php` (신규)
- `app/Providers/AppServiceProvider.php` (수정, `PaymentGateway` 바인딩)
- `config/services.php` (수정, `portone` 설정 추가)
- `routes/api.php`, `routes/console.php` (수정)
- `resources/openapi.yaml` (수정)

운영 `.env`에 `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET`을 추가합니다. **테스트 모드 키가 아니라 운영(라이브) 키를 발급해서 씁니다.** 프론트 `.env`(Vercel)에도 `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`를 같은 값으로 맞춥니다(둘 다 비밀값이 아니라 공개해도 되는 식별자입니다).

포트원 콘솔의 웹훅 설정에 `https://yjwest9.dothome.co.kr/api/v1/webhooks/portone`을 등록하고, 콘솔에서 발급한 웹훅 시크릿을 `PORTONE_WEBHOOK_SECRET`에 그대로 넣습니다.

업로드 뒤 [마이그레이션 실행 스크립트](#마이그레이션-실행-스크립트)로 `migrate --force`와 `config:clear`를 실행합니다. 새 엔드포인트가 404면 `route:clear`도 실행합니다. 매일 자동 정기결제(`subscriptions:charge-due`)는 기존 `notifications:send-daily-reminders`와 같은 스케줄러(`schedule:run`)에 등록되어 있으므로 별도 cron 등록은 필요 없습니다 — [5번](#5-운영-안전-기준)의 스케줄러 cron이 이미 있어야 합니다.

프로 전용 기능(날씨 반영 일정, 사진 비교, 무제한 공유)은 아직 구현되어 있지 않습니다. 이 배포는 결제·구독·해지·정기청구 파이프라인만 켜는 것이며, 실제로 프로 전용 기능을 잠그거나 열어 주는 서버 로직은 없습니다.

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

라우트 캐시(`route:cache`)를 쓰고 있지 않다면 새 라우트는 파일 업로드만으로 바로 반영되며 `route:clear`가 필요 없습니다. 새 엔드포인트가 404로 응답할 때만 아래 캐시 정리 스크립트를 사용합니다.

캐시 정리 전용 일회용 스크립트(마이그레이션 등 데이터를 바꾸는 명령은 포함하지 않습니다):

```php
<?php
// _deploy_clear.php — 확인 후 서버에서 즉시 삭제
$token = '무작위_문자열로_직접_교체';
$allowed = ['route:clear', 'config:clear', 'cache:clear', 'view:clear'];

header('Content-Type: text/plain; charset=utf-8');
if (($_GET['token'] ?? '') !== $token) { http_response_code(403); exit('forbidden'); }
$cmd = $_GET['cmd'] ?? '';
if (!in_array($cmd, $allowed, true)) { http_response_code(400); exit('cmd must be one of: '.implode(', ', $allowed)); }

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$status = Illuminate\Support\Facades\Artisan::call($cmd);
echo "command: {$cmd}\nstatus: {$status}\n\n".Illuminate\Support\Facades\Artisan::output();
```

`public/`에 올리고 `https://yjwest9.dothome.co.kr/_deploy_clear.php?token=...&cmd=route:clear`로 접속해 결과를 확인한 다음 파일을 바로 삭제합니다. `$token`은 매번 새 무작위 문자열로 바꾸고 Git에 실제 토큰 값을 커밋하지 않습니다.

## 5. 운영 안전 기준

- `.env`, `vendor`, 업로드 파일을 Git에 커밋하지 않습니다.
- 운영 서버에서 `APP_DEBUG=true`를 사용하지 않습니다.
- 운영 DB에 `migrate:fresh`를 실행하지 않습니다.
- 배포 전 DB를 백업하고, 마이그레이션은 한 번에 한 배포만 실행합니다.
- 프론트엔드에는 DB 비밀번호나 `APP_KEY`를 넣지 않습니다.
- 예약 알림을 구현할 때는 cron이 매분 `php artisan schedule:run`을 실행할 수 있는지 확인합니다. `notifications:send-daily-reminders`(매일 07:00)가 이 스케줄러에 등록되어 있습니다.
- 위 명령이 큐에 넣는 메일은 `QUEUE_CONNECTION=database`라 `php artisan queue:work`가 계속 돌지 않으면 `jobs` 테이블에 쌓이기만 하고 발송되지 않습니다. 닷홈은 SSH가 없어 워커 프로세스를 상시 실행할 수 없으므로, cron에 `php artisan queue:work --stop-when-empty --max-time=50`처럼 짧게 끝나는 실행을 몇 분 간격으로 추가해야 합니다. 배포 리허설에서 이 cron 항목도 함께 확인합니다.
