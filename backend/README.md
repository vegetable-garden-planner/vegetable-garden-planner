# Vegetable Garden Planner API

Next.js 프론트엔드에 JSON API를 제공하는 Laravel 12 백엔드입니다.

## 요구 사항

- PHP 8.2 이상
- Composer 2
- MySQL 8 또는 호환 MariaDB

현재 Laragon 환경에서는 PHP 8.3을 사용합니다. 운영 호스팅도 위 PHP 요구 사항과 Laravel 필수 확장을 지원해야 합니다.

## 로컬 실행

저장소 복제부터 DB 생성, 프론트엔드 실행까지 포함한 최초 설정은 [팀원 로컬 개발환경 설정](../docs/LOCAL_DEVELOPMENT.md)을 따릅니다.

이미 최초 설정을 마쳤다면 Laragon에서 MySQL을 시작하고 다음 명령으로 백엔드를 실행합니다.

```powershell
php artisan migrate
php artisan serve
```

API 상태 확인:

```text
GET http://127.0.0.1:8000/api/v1/health
```

Swagger API 문서:

```text
http://127.0.0.1:8000/api-docs
```

Swagger UI와 `/api-docs/openapi.yaml`은 [OpenAPI 명세](resources/openapi.yaml) 한 파일을 함께 사용합니다.

## 환경 파일

`.env`는 개인·운영 비밀번호와 키를 포함하므로 Git에 올리지 않습니다. 팀에는 `.env.example`만 공유합니다. 운영 설정은 [닷홈 배포 가이드](../docs/DOTHOME_DEPLOYMENT.md)를 따릅니다.

## 데이터베이스 기준

Laravel의 `database/migrations`가 유일한 데이터베이스 스키마 기준입니다. 새 환경에서는 빈 DB를 만든 뒤 `php artisan migrate`만 실행합니다. SQL 스키마 가져오기나 phpMyAdmin 수동 컬럼 변경으로 구조를 공유하지 않습니다.

사용자 및 외부 공개 자원 ID는 UUIDv7, 작물 ID는 slug를 사용합니다. 스키마를 phpMyAdmin에서만 수정하지 말고 반드시 새 Laravel 마이그레이션으로 기록합니다.

## 구현된 사용자 API

- 세션 인증과 현재 사용자 조회
- 작물 기준정보 조회
- 재배 공간·시즌·텃밭 배치
- 재배 일정 생성·상태 변경
- 시즌 활동 기록
- 시즌·작물별 물주기 일정, 완료·미루기 이력과 최신 완료 취소

변경 API는 응답의 `ETag`를 다음 요청의 `If-Match`로 보내 동시 수정 충돌을 방지합니다. 전체 계약은 [OpenAPI 명세](resources/openapi.yaml)를 기준으로 확인합니다.
