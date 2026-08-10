# 텃밭 플래너 데이터베이스 설정 가이드

이 문서는 조원 누구나 같은 이름과 같은 컬럼으로 로컬 데이터베이스를 만드는 방법을 설명합니다.

> **Laravel 작업 전 확인:** 현재 `database/schema.sql`은 초기 설계용 SQL이라 주요 테이블 ID가 `BIGINT AUTO_INCREMENT`로 작성되어 있습니다. 최종 기준은 API 문서에서 확정한 **UUIDv7**입니다. Laravel 모델과 마이그레이션을 만들 때 사용자·공간·시즌·배치·일정·기록처럼 외부에 노출되는 자원의 기본 키와 외래 키를 UUIDv7 호환 타입으로 함께 바꿔야 합니다. 현재 숫자형 ID를 최종 설계로 복사하지 않습니다.

작물 ID는 예외입니다. `lettuce`, `young-radish`처럼 코드에서 의미를 알 수 있는 slug를 사용합니다. 요금제 분류처럼 외부 자원 ID가 아닌 내부 고정 코드도 별도 문자열 코드를 사용할 수 있습니다.

## 1. 구조 먼저 이해하기

브라우저에서 MariaDB에 직접 연결하면 안 됩니다.

```text
Next.js 화면 → Laravel API → MariaDB (XAMPP)
```

- 데이터베이스 이름: `vegetable_garden_planner`
- 전체 새 설치 파일: `database/schema.sql`
- 예전 51개 테이블 DB의 결제 구조 업데이트 파일: `database/migrations/20260807_01_expand_billing.sql`
- 기존 DB의 물주기 완료 취소 지원 파일: `database/migrations/20260807_02_add_watering_log_schedule.sql`
- 기존 DB의 물주기 규칙·일정 무결성 보완 파일: `database/migrations/20260807_03_harden_watering_rules_and_schedule.sql`
- 공통 요금제 초기 데이터: `database/seeds/20260807_billing_plans.sql`
- 현재 프런트엔드의 일부 기능은 아직 `localStorage`를 사용하므로, 실제 DB 사용에는 Laravel API 연결 작업이 별도로 필요합니다.

## 2. 처음 설치하는 조원

### 가장 쉬운 방법: phpMyAdmin

1. XAMPP Control Panel에서 **MySQL**을 시작합니다.
2. 브라우저에서 `http://localhost/phpmyadmin`을 엽니다.
3. 위쪽 **가져오기(Import)** 메뉴를 누릅니다.
4. 프로젝트의 `database/schema.sql` 파일을 선택합니다.
5. 아래쪽 **가져오기/실행** 버튼을 누릅니다.
6. 왼쪽 목록을 새로고침해 `vegetable_garden_planner`가 보이는지 확인합니다.

`schema.sql`이 데이터베이스와 전체 테이블을 함께 만들기 때문에 빈 데이터베이스를 먼저 만들 필요는 없습니다.

### PowerShell로 설치하는 방법

프로젝트 폴더에서 아래 명령을 실행합니다.

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' `
  --default-character-set=utf8mb4 `
  --protocol=TCP --host=127.0.0.1 --port=3306 --user=root `
  --execute="SOURCE database/schema.sql;"
```

XAMPP의 `root` 계정에 비밀번호를 설정했다면 명령 끝에 `--password`를 붙이고, 표시되는 입력창에 비밀번호를 입력합니다.

## 3. 예전에 만든 51개 테이블 DB가 있는 조원

이미 `vegetable_garden_planner`가 있고 `webhook_events` 테이블이 없다면 아래 파일을 **한 번만** 가져옵니다.

```text
database/migrations/20260807_01_expand_billing.sql
```

phpMyAdmin의 **가져오기(Import)**에서 위 파일을 선택하거나 다음 명령을 사용합니다.

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' `
  --default-character-set=utf8mb4 `
  --protocol=TCP --host=127.0.0.1 --port=3306 --user=root `
  --database=vegetable_garden_planner `
  --execute="SOURCE database/migrations/20260807_01_expand_billing.sql;"
```

같은 마이그레이션을 두 번 실행하면 `Duplicate column` 오류가 납니다. 이미 `webhook_events`가 보이면 다시 실행하지 않습니다.

물주기 완료 취소 기능을 추가하려면 `watering_logs`에 `scheduled_for`가 있는지 확인합니다. 없다면 다음 파일을 **한 번만** 가져옵니다.

```text
database/migrations/20260807_02_add_watering_log_schedule.sql
```

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' `
  --default-character-set=utf8mb4 `
  --protocol=TCP --host=127.0.0.1 --port=3306 --user=root `
  --database=vegetable_garden_planner `
  --execute="SOURCE database/migrations/20260807_02_add_watering_log_schedule.sql;"
```

이 파일도 같은 DB에 두 번 실행하지 않습니다. 새로 `schema.sql`로 설치한 DB에는 이미 해당 컬럼이 들어 있습니다.

물주기 규칙 중복 방지와 일정 수정 시각 저장을 추가하려면 다음 파일을 이어서 **한 번만** 가져옵니다.

```text
database/migrations/20260807_03_harden_watering_rules_and_schedule.sql
```

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' `
  --default-character-set=utf8mb4 `
  --protocol=TCP --host=127.0.0.1 --port=3306 --user=root `
  --database=vegetable_garden_planner `
  --execute="SOURCE database/migrations/20260807_03_harden_watering_rules_and_schedule.sql;"
```

`watering_rules`에 같은 `crop_id`와 `growth_stage` 조합이 여러 건 있으면 유니크 키 추가가 중단됩니다. 중복 규칙을 하나로 정리한 뒤 다시 실행합니다. 새로 `schema.sql`로 설치한 DB에는 이 변경도 이미 포함되어 있습니다.

## 4. Free/Pro 초기 데이터 넣기

처음 설치한 조원과 기존 DB를 업데이트한 조원 모두 `database/seeds/20260807_billing_plans.sql`을 가져옵니다. 이 시드 파일은 여러 번 실행해도 중복되지 않습니다.

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' `
  --default-character-set=utf8mb4 `
  --protocol=TCP --host=127.0.0.1 --port=3306 --user=root `
  --database=vegetable_garden_planner `
  --execute="SOURCE database/seeds/20260807_billing_plans.sql;"
```

## 5. Laravel 연결 설정

Laravel 프로젝트의 `.env`에 아래 내용을 넣습니다. XAMPP 설정이 다르면 포트, 계정, 비밀번호만 맞게 바꿉니다.

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=vegetable_garden_planner
DB_USERNAME=root
DB_PASSWORD=
```

설정 변경 뒤 Laravel 프로젝트에서 캐시를 비웁니다.

```powershell
php artisan config:clear
```

DB 계정과 비밀번호를 Next.js의 `NEXT_PUBLIC_...` 환경 변수에 넣으면 브라우저에 노출될 수 있으므로 절대 넣지 않습니다.

## 6. 제대로 설치됐는지 확인하기

phpMyAdmin에서 `vegetable_garden_planner`를 선택하고 다음 SQL을 실행합니다.

```sql
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'vegetable_garden_planner';

SHOW COLUMNS FROM payments;
SHOW COLUMNS FROM subscriptions;
SHOW COLUMNS FROM webhook_events;
SHOW COLUMNS FROM watering_rules;
SHOW INDEX FROM watering_rules;
SHOW COLUMNS FROM watering_schedules;
SHOW COLUMNS FROM watering_logs;

SELECT p.code, p.name, p.price, pf.feature_key, pf.limit_value, pf.enabled
FROM plans p
JOIN plan_features pf ON pf.plan_id = p.id
ORDER BY p.code, pf.feature_key;
```

현재 기준 테이블 수는 **52개**입니다. `payments`에 `order_id`, `provider`, `requested_at`이 있고, `webhook_events`가 있으면 결제용 확장까지 적용된 상태입니다. 물주기 준비가 완료된 DB는 `watering_logs.scheduled_for`와 `watering_schedules.updated_at`이 모두 `NOT NULL`이고, `watering_rules`에 `uk_watering_rules_crop_stage` 유니크 키가 있습니다. 마지막 조회에서 Free와 Pro가 각각 기능 4개씩 나오면 초기 데이터도 정상입니다.

## 7. 결제 관련 테이블 역할

| 테이블 | 역할 |
| --- | --- |
| `plans` | Free, Pro 같은 요금제 정보 |
| `plan_features` | 요금제별 기능 사용 여부와 한도 |
| `subscriptions` | 사용자가 이용 중인 요금제와 구독 기간 |
| `payments` | 결제 요청, 승인, 실패 정보 |
| `payment_refunds` | 환불 요청과 성공·실패 정보 |
| `webhook_events` | 결제사 알림 원문 저장 및 중복 처리 방지 |

권장 상태 문자열은 다음과 같이 통일합니다.

- `subscriptions.status`: `pending`, `active`, `canceled`, `expired`, `past_due`
- `payments.status`: `pending`, `paid`, `failed`, `canceled`, `partially_refunded`, `refunded`
- `payment_refunds.status`: `pending`, `succeeded`, `failed`
- `webhook_events.status`: `pending`, `processed`, `failed`

현재 사용하는 `plan_features.feature_key`는 `max_gardens`, `max_seasons`, `max_members`, `pdf_export`입니다. `limit_value`가 `NULL`이면 무제한으로 해석하고, 기능 자체를 끌 때는 `enabled = FALSE`를 사용합니다.

현재 공통 요금제 정책은 다음과 같습니다.

| 기능 | Free | Pro |
| --- | --- | --- |
| 가격 | 0원 | 월 4,900원 |
| 텃밭 수 | 1개 | 무제한 |
| 시즌 수 | 2개 | 무제한 |
| 공동 멤버 수 | 1명 | 5명 |
| PDF 내보내기 | 사용 불가 | 사용 가능 |

스키마 설치 후 `database/seeds/20260807_billing_plans.sql`을 가져오면 위 정책이 저장됩니다. 이 파일은 같은 내용을 갱신하는 방식이라 여러 번 실행해도 요금제나 기능 행이 중복되지 않습니다.

## 8. 팀에서 컬럼을 추가할 때 규칙

1. phpMyAdmin에서 자기 DB만 수동 수정하고 끝내지 않습니다.
2. `database/migrations`에 다음 번호의 SQL 파일을 추가합니다.
3. 새로 설치하는 사람도 같은 구조가 되도록 `database/schema.sql`도 함께 수정합니다.
4. 바뀐 테이블, 컬럼, 실행 순서를 조원에게 알립니다.
5. 이미 공유된 마이그레이션 파일은 수정하지 말고 새 파일을 만듭니다.

이 규칙을 지키면 조원마다 테이블명이나 컬럼명이 달라지는 문제를 피할 수 있습니다.

## 9. 자주 생기는 오류

- `Can't connect`: XAMPP에서 MySQL이 실행 중인지 확인합니다.
- `Access denied`: 본인의 `root` 비밀번호를 확인하고 `--password`를 사용합니다.
- DB가 안 보임: phpMyAdmin 왼쪽 목록을 새로고침합니다.
- `Duplicate column` 또는 `Table already exists`: 이미 마이그레이션을 실행했는지 `webhook_events` 존재 여부를 먼저 확인합니다.
- Laravel만 연결 안 됨: `.env` 수정 후 `php artisan config:clear`를 실행합니다.
