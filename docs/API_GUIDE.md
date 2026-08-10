# 심어봄 API 설계 문서

> 상태: 설계 초안 · 아직 Laravel API는 구현되지 않음
> 기계 판독 명세: [`openapi.yaml`](./openapi.yaml)

## 1. API가 무엇인가

API(Application Programming Interface)는 서로 다른 프로그램이 정해진 방식으로 요청과 응답을 주고받는 접점이다.

심어봄에서는 다음 과정의 가운데 계약에 해당한다.

```text
브라우저의 Next.js 화면
  └─ HTTP 요청: POST /api/v1/spaces + 입력 JSON
      └─ Laravel API
          └─ 데이터베이스 저장
      └─ HTTP 응답: 201 Created + 저장 결과 JSON
```

프론트엔드는 데이터베이스 테이블을 직접 다루지 않는다. 어떤 주소로 어떤 값을 보내면 어떤 결과나 오류가 돌아오는지를 API 문서에 따라 사용한다. 백엔드 역시 프론트 화면 내부 구현을 몰라도 같은 계약을 지키면 된다.

예를 들어 재배 공간을 만드는 요청은 다음과 같다.

```http
POST /api/v1/spaces
Content-Type: application/json
Cookie: laravel_session={브라우저가 자동 전송하는 세션 쿠키}
X-XSRF-TOKEN: {CSRF 쿠키 값}
```

```json
{
  "name": "주말 텃밭",
  "type": "garden",
  "sunlight": "full",
  "widthCm": 200,
  "lengthCm": 300,
  "region": "서울",
  "notes": "남향 구역"
}
```

성공하면 서버는 `201 Created`와 생성된 공간을 반환한다. 값이 잘못되면 `422 Unprocessable Content`, 로그인하지 않았으면 `401 Unauthorized`를 반환한다.

## 2. 이 문서의 목적과 현재 한계

현재 프로젝트는 공간·시즌·격자를 브라우저 `localStorage`에 저장하며 실제 API 호출은 하지 않는다. 따라서 이 문서는 다음 목적으로 작성되었다.

- Laravel 구현 전에 URL, HTTP 메서드와 데이터 구조를 합의한다.
- 프론트 타입과 백엔드 응답 이름이 달라지는 일을 줄인다.
- 정상 응답뿐 아니라 인증·검증·충돌·없음 오류를 미리 정의한다.
- Swagger UI, Postman과 자동 클라이언트 생성에 사용할 기반을 만든다.

문서에 적었다고 기능이 구현된 것은 아니다. `openapi.yaml`의 모든 엔드포인트는 현재 **계획 상태**다.

## 3. 공통 규칙

| 항목 | 규칙 | 이유 |
|---|---|---|
| 기본 경로 | `/api/v1` | 이후 호환되지 않는 변경을 `/v2`로 분리 |
| 데이터 형식 | JSON | Next.js와 Laravel에서 공통 사용하기 쉬움 |
| 필드 이름 | `camelCase` | 현재 TypeScript 도메인 타입과 일치 |
| 날짜 | `YYYY-MM-DD` | 시즌처럼 시간대가 필요 없는 날짜 |
| 날짜·시간 | ISO 8601 UTC | `2026-08-07T08:00:00Z` 형식 |
| 인증 | Sanctum SPA 세션 쿠키 | 자사 브라우저 앱에서 토큰을 JavaScript 저장소에 노출하지 않음 |
| ID | 사용자 데이터는 UUIDv7, 작물은 slug | 정렬 가능한 고유 ID와 읽기 쉬운 기준 데이터 ID |
| 동시 수정 | `version`과 `If-Match` | 오래된 화면이 최신 변경을 덮어쓰는 문제 방지 |
| 목록 | `data`와 `meta` 사용 | 페이지 정보와 실제 목록 분리 |
| 오류 | `error.code`, `error.message`, `error.fields` | 화면이 오류 종류와 필드 오류를 구분 가능 |

### 성공 응답

단일 자원:

```json
{
  "data": {
    "id": "019c2a31-7600-7000-8000-000000000001",
    "name": "주말 텃밭"
  }
}
```

목록:

```json
{
  "data": [],
  "meta": {
    "currentPage": 1,
    "perPage": 20,
    "total": 0,
    "lastPage": 1
  }
}
```

삭제 성공은 본문 없이 `204 No Content`를 반환한다.

### 오류 응답

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "입력값을 확인해 주세요.",
    "fields": {
      "widthCm": ["가로는 10cm 이상이어야 합니다."]
    }
  }
}
```

| 상태 코드 | 의미 | 예시 |
|---|---|---|
| `400` | 요청 형식 자체가 잘못됨 | 깨진 JSON |
| `401` | 로그인 필요 또는 토큰 만료 | 인증 헤더 없음 |
| `403` | 로그인했지만 권한 없음 | 다른 사용자의 공간 접근 |
| `404` | 자원을 찾을 수 없음 | 없는 시즌 ID |
| `409` | 현재 데이터 관계와 충돌 | 시즌이 연결된 공간 삭제, 시즌 기간 중복 |
| `412` | 다른 곳에서 먼저 수정됨 | 전송한 `If-Match` 버전이 현재 버전과 다름 |
| `419` | CSRF 검증 실패 | CSRF 쿠키 또는 헤더 누락 |
| `422` | 입력값 검증 실패 | 이름 누락, 크기 범위 초과 |
| `500` | 예상하지 못한 서버 오류 | 내부 예외 |

서버 내부 예외 메시지나 스택 추적은 응답으로 노출하지 않는다.

## 4. MVP 엔드포인트

### 인증

심어봄은 Next.js 웹앱과 Laravel API가 같은 최상위 도메인에서 동작하는 자사 SPA를 전제로 한다. 따라서 Laravel Sanctum의 세션 쿠키 인증을 사용한다.

```text
GET /sanctum/csrf-cookie
  → POST /api/v1/auth/login
  → 브라우저가 HttpOnly 세션 쿠키 보관
  → 이후 요청마다 쿠키 자동 전송
```

세션 쿠키는 JavaScript가 직접 읽지 못하도록 `HttpOnly`, HTTPS에서만 보내도록 `Secure`, 사이트 간 전송을 제한하도록 적절한 `SameSite` 속성을 설정한다. 상태를 바꾸는 요청은 CSRF 토큰도 검사한다. Bearer 토큰은 향후 모바일 앱이나 제3자 API를 제공할 때 별도로 추가한다.

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| `GET` | `/sanctum/csrf-cookie` | 로그인 전 CSRF 쿠키 발급 | 불필요 |
| `POST` | `/auth/register` | 회원가입과 세션 시작 | 불필요 |
| `POST` | `/auth/login` | 로그인과 세션 시작 | 불필요 |
| `POST` | `/auth/logout` | 현재 세션 종료 | 필요 |
| `GET` | `/me` | 로그인 사용자 조회 | 필요 |

### 작물 기준 데이터

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| `GET` | `/crops` | 작물 검색·분류·공간 필터 | 불필요 |
| `GET` | `/crops/{cropId}` | 작물 한 건 조회 | 불필요 |

작물 목록은 운영자가 관리하는 기준 데이터다. 일반 사용자는 이 API에서 수정하거나 삭제할 수 없다.

### 관리자 작물·재배 규칙

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| `GET` | `/admin/crops` | 공개 전·공개·보관 작물 목록 | 관리자 |
| `POST` | `/admin/crops` | 작물과 재배 규칙 등록 | 관리자 |
| `GET` | `/admin/crops/{cropId}` | 관리자용 작물 한 건 조회 | 관리자 |
| `PATCH` | `/admin/crops/{cropId}` | 작물·간격·시기·공개 상태 수정 | 관리자 |
| `DELETE` | `/admin/crops/{cropId}` | 사용되지 않은 공개 전 작물 삭제 | 관리자 |

포기 간격, 심는 시기와 수확 시기는 작물 없이는 의미가 없으므로 별도 규칙 API로 분리하지 않고 작물 기준 데이터의 필드로 함께 관리한다. 사용자 화면의 `GET /crops`는 `published` 상태만 반환한다. 관리자는 새 작물을 `draft`로 검토한 뒤 `published`로 공개하고, 더 이상 권장하지 않는 작물은 `archived`로 바꾼다.

작물 slug는 격자 배치와 일정이 참조하므로 등록 후 변경할 수 없다. 이미 배치·일정에서 사용 중인 작물은 삭제하면 과거 데이터의 의미가 사라지므로 `409 CROP_IN_USE`로 거부하고 보관 처리한다. 실제 삭제는 한 번도 참조되지 않은 `draft` 작물만 허용한다.

관리자 API도 세션 인증만으로 허용하지 않는다. `/me` 응답의 `role`이 `admin`인지 서버 정책에서 검사하며, 일반 회원은 `403 ADMIN_REQUIRED`를 받는다. 수정과 삭제에는 다른 관리자와의 충돌을 막기 위해 `ETag`와 `If-Match`를 사용한다. 누가 언제 어떤 값을 바꿨는지는 별도 변경 이력 테이블에 수정 전·후 값과 관리자 ID를 저장한다.
공개 식물 목록에는 텃밭 채소뿐 아니라 꽃다발과 화분 꽃도 포함할 수 있다. 꽃은 `category: flower`로 구분하고, 시작 형태는 `potted-plant` 또는 `cut-flower`를 사용한다. 꽃 관리 정보가 있는 경우 `careGuide`에 예상 감상·생존 기간, 빛, 물, 온도와 첫 관리 행동을 제공한다.

식물 상세 화면에서 재배를 시작하면 시즌의 선택 필드인 `featuredCropId`에 식물 slug를 저장한다. 이 값은 사용자가 어떤 식물에서 시작했는지 이어 주는 용도이며, 한 시즌의 전체 작물 배치는 기존 격자 데이터가 계속 담당한다.

### 재배 공간

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| `GET` | `/spaces` | 내 공간 목록 | 필요 |
| `POST` | `/spaces` | 공간 등록 | 필요 |
| `GET` | `/spaces/{spaceId}` | 내 공간 한 건 조회 | 필요 |
| `PATCH` | `/spaces/{spaceId}` | 공간 일부 수정 | 필요 |
| `DELETE` | `/spaces/{spaceId}` | 공간 삭제 | 필요 |

연결된 시즌이 있는 공간 삭제는 `409 SPACE_HAS_SEASONS`로 거부한다. 사용자가 다른 사용자의 공간 ID를 알아도 조회·수정·삭제할 수 없도록 소유권을 검사한다.

사용자·공간·시즌·일정·기록의 ID는 UUIDv7을 사용한다. Laravel 12 이상에서 모델에 `HasUuids`를 적용하면 기본 UUIDv7을 사용할 수 있다. 작물 ID는 `lettuce`, `young-radish`처럼 코드와 문서에서 읽기 쉬운 slug를 유지한다.

UUIDv7을 선택한 이유는 다음과 같다.

- 여러 서버나 클라이언트가 중앙 번호표 없이도 충돌 가능성이 매우 낮은 ID를 만들 수 있다.
- `1`, `2`, `3`처럼 순서대로 노출되는 숫자 ID와 달리 URL만 보고 전체 데이터 수나 다음 ID를 짐작하기 어렵다.
- 생성 시간이 앞부분에 반영되어 무작위 UUIDv4보다 대체로 시간순으로 정렬되고 데이터베이스 인덱스가 덜 흩어진다.
- 향후 공동 텃밭, 여러 기기 동기화와 데이터 이전에서도 기존 ID를 유지하기 쉽다.

UUID는 숫자형 ID보다 저장 공간과 인덱스 비용이 크다. 그래도 현재 서비스 규모에서는 운영 데이터의 일관성과 확장 편의가 더 중요하다고 판단한다. 기본 키와 이를 참조하는 외래 키는 반드시 같은 UUID 타입을 사용한다. 현재 `database/schema.sql`의 `BIGINT AUTO_INCREMENT`는 초기 설계안이므로 Laravel 마이그레이션을 만들 때 그대로 옮기지 않는다.

### 재배 시즌

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| `GET` | `/seasons` | 내 시즌 목록과 상태 조회 | 필요 |
| `POST` | `/seasons` | 공간에 시즌 등록 | 필요 |
| `GET` | `/seasons/{seasonId}` | 내 시즌 한 건 조회 | 필요 |
| `PATCH` | `/seasons/{seasonId}` | 시즌 일부 수정 | 필요 |
| `DELETE` | `/seasons/{seasonId}` | 시즌 삭제 | 필요 |

`planned`, `active`, `completed` 상태는 저장하지 않고 서버의 오늘 날짜와 시작일·종료일로 계산한다. 같은 공간에서 기간이 하루라도 겹치면 `409 SEASON_PERIOD_OVERLAP`으로 거부한다.

### 텃밭 격자와 작물 배치

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| `GET` | `/seasons/{seasonId}/layout` | 시즌의 격자와 작물 배치 조회 | 필요 |
| `PUT` | `/seasons/{seasonId}/layout` | 격자와 전체 배치를 생성 또는 교체 | 필요 |
| `DELETE` | `/seasons/{seasonId}/layout` | 격자와 배치 삭제 | 필요 |

시즌 하나에는 격자 하나만 존재하므로 컬렉션이 아닌 단일 하위 자원으로 표현했다. `PUT`은 같은 요청을 여러 번 보내도 최종 상태가 같도록 전체 격자 상태를 저장한다.

- 격자는 `garden` 공간의 시즌에만 생성한다.
- 셀 크기는 `10`, `25`, `50`, `100`cm만 허용한다.
- 클라이언트는 공간 크기와 셀 크기를 보내고, 서버가 `columns`와 `rows`를 다시 계산한다.
- 전체 셀은 최대 400개다.
- `cellIndex`는 `0`부터 `columns × rows - 1`까지다.
- 한 셀에는 작물 하나만 배치한다.
- 공간 크기가 바뀐 뒤 기존 크기로 저장하려 하면 `409 SPACE_DIMENSIONS_CHANGED`를 반환한다.
- 격자가 연결된 시즌 삭제는 `409 SEASON_HAS_LAYOUT`으로 거부한다.

## 5. 일정과 기록 API 단위

일정과 기록은 역할이 다르므로 별도 자원으로 나눈다.

- 일정(`Task`): 앞으로 해야 할 일. 예정일, 완료 여부와 완료 시각을 가진다.
- 기록(`Record`): 실제로 한 일이나 관찰한 내용. 발생 시각과 메모를 가진다.

```text
GET    /seasons/{seasonId}/tasks
POST   /seasons/{seasonId}/tasks/generate
PATCH  /tasks/{taskId}
DELETE /tasks/{taskId}

GET    /seasons/{seasonId}/records
POST   /seasons/{seasonId}/records
PATCH  /records/{recordId}
DELETE /records/{recordId}
```

현재 프론트엔드 프로토타입의 자동 생성은 텃밭 격자에 배치된 작물 종류마다 심기·파종 일정과 수확 시작 일정을 하나씩 만든다. 예정일은 시즌 기간 안에서 작물의 월 단위 권장 시기와 겹치는 첫 날짜를 사용하며, `cropId`로 기준 작물과 연결한다. 같은 작물이 여러 칸에 배치되어도 일정은 중복 생성하지 않는다. 권장 시기가 시즌과 겹치지 않는 작물이 하나라도 있으면 부분 저장하지 않고 전체 생성을 거부한다. 물주기 반복 일정은 별도 기능에서 정의한다.

MVP 기록은 `watering`, `work`, `growth`, `harvest`를 `type` 필드로 구분하고 하나의 API를 사용한다. 종류마다 별도 엔드포인트를 만들지 않아 공통 날짜·메모·수정·삭제 규칙을 중복하지 않는다. 이미지 첨부는 파일 저장소가 결정된 뒤 별도 첨부 자원으로 확장한다.

## 6. 동시 수정 충돌 처리

공간·시즌·격자·일정·기록 응답에는 1부터 증가하는 `version`을 포함한다. 서버는 같은 값을 `ETag` 응답 헤더에도 보낸다.

```http
ETag: "3"
```

사용자가 수정하거나 삭제할 때 마지막으로 본 버전을 `If-Match`로 보낸다.

```http
PATCH /api/v1/spaces/{spaceId}
If-Match: "3"
```

서버의 현재 버전도 3이면 트랜잭션 안에서 저장하고 4로 증가시킨다. 이미 다른 기기에서 수정해 서버 버전이 4라면 저장하지 않고 `412 PRECONDITION_FAILED`를 반환한다. 화면은 최신 데이터를 다시 불러오고 사용자가 재시도하게 한다. `updatedAt` 문자열만 비교하는 것보다 시간 정밀도와 시간대 문제를 피할 수 있다.

## 7. 대표 요청 흐름

```text
GET /sanctum/csrf-cookie
  → POST /auth/login
  → GET /spaces
  → POST /spaces
  → POST /seasons
  → PUT /seasons/{seasonId}/layout
  → GET /seasons/{seasonId}/layout
```

대시보드 전용 API는 지금 만들지 않는다. 초기에는 공간·시즌·격자 응답으로 화면 요약을 계산한다. 요청 수나 성능 문제가 실제로 확인되면 `/dashboard` 집계 API를 별도로 검토한다.

## 8. 확정한 설계와 나중에 확장할 항목

이번 단계에서 다음과 같이 확정한다.

- 자사 웹앱 인증은 Sanctum SPA 세션 쿠키를 사용한다.
- 사용자 데이터 기본 키는 UUIDv7과 데이터베이스의 UUID 호환 컬럼을 사용한다.
- 일정과 실제 기록은 별도 자원으로 관리한다.
- 수정 가능한 자원은 정수 `version`과 `If-Match`로 충돌을 검사한다.

다음은 기능 구현 시점에 구체화하되 위 결정을 뒤집지는 않는 항목이다.

- 목록 페이지 크기와 정렬 쿼리 규칙
- 회원 이메일 인증·비밀번호 재설정 API 범위
- 관리자 초대·권한 회수 운영 절차
- 일정 자동 생성 규칙과 반복 일정 표현
- 기록 이미지 첨부와 파일 저장소

설계는 모든 미래 요구사항을 미리 맞히는 작업이 아니다. 현재 제품 범위에 필요한 기본안을 정하고, 확장 지점을 기록하는 작업이다.

## 9. 구현할 때 확인할 기준

- OpenAPI 명세와 Laravel 요청 검증 규칙이 같은가?
- 프론트 타입과 응답 스키마가 같은가?
- 모든 보호 API가 인증과 소유권을 각각 검사하는가?
- 정상 경로뿐 아니라 `401`, `403`, `404`, `409`, `422` 테스트가 있는가?
- 삭제와 수정이 실패했을 때 기존 데이터가 유지되는가?
- API 변경 시 `openapi.yaml`과 이 문서를 함께 수정했는가?

교수님께 설명할 때는 “화면이 데이터베이스에 직접 접근하지 않도록, Laravel과 주고받을 주소·입력·출력·오류를 미리 OpenAPI로 정의했다”고 요약할 수 있다.

## 참고한 공식 문서

- [Laravel Sanctum SPA 인증](https://laravel.com/docs/13.x/sanctum#spa-authentication)
- [Laravel Eloquent UUID와 ULID](https://laravel.com/docs/12.x/eloquent#uuid-and-ulid-keys)
- [HTTP 조건부 요청과 If-Match](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-match)
