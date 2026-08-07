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
Authorization: Bearer {token}
Content-Type: application/json
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
| 인증 | Bearer token | Laravel Sanctum 토큰 연동을 가정한 초안 |
| ID | 사용자 데이터는 UUID, 작물은 slug | 추측하기 어려운 사용자 ID와 읽기 쉬운 기준 데이터 ID |
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
| `422` | 입력값 검증 실패 | 이름 누락, 크기 범위 초과 |
| `500` | 예상하지 못한 서버 오류 | 내부 예외 |

서버 내부 예외 메시지나 스택 추적은 응답으로 노출하지 않는다.

## 4. MVP 엔드포인트

### 인증

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| `POST` | `/auth/register` | 회원가입과 토큰 발급 | 불필요 |
| `POST` | `/auth/login` | 로그인과 토큰 발급 | 불필요 |
| `POST` | `/auth/logout` | 현재 토큰 폐기 | 필요 |
| `GET` | `/me` | 로그인 사용자 조회 | 필요 |

### 작물 기준 데이터

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| `GET` | `/crops` | 작물 검색·분류·공간 필터 | 불필요 |
| `GET` | `/crops/{cropId}` | 작물 한 건 조회 | 불필요 |

작물 목록은 운영자가 관리하는 기준 데이터다. 일반 사용자는 이 API에서 수정하거나 삭제할 수 없다.

### 재배 공간

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| `GET` | `/spaces` | 내 공간 목록 | 필요 |
| `POST` | `/spaces` | 공간 등록 | 필요 |
| `GET` | `/spaces/{spaceId}` | 내 공간 한 건 조회 | 필요 |
| `PATCH` | `/spaces/{spaceId}` | 공간 일부 수정 | 필요 |
| `DELETE` | `/spaces/{spaceId}` | 공간 삭제 | 필요 |

연결된 시즌이 있는 공간 삭제는 `409 SPACE_HAS_SEASONS`로 거부한다. 사용자가 다른 사용자의 공간 ID를 알아도 조회·수정·삭제할 수 없도록 소유권을 검사한다.

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

## 5. 대표 요청 흐름

```text
POST /auth/login
  → GET /spaces
  → POST /spaces
  → POST /seasons
  → PUT /seasons/{seasonId}/layout
  → GET /seasons/{seasonId}/layout
```

대시보드 전용 API는 지금 만들지 않는다. 초기에는 공간·시즌·격자 응답으로 화면 요약을 계산한다. 요청 수나 성능 문제가 실제로 확인되면 `/dashboard` 집계 API를 별도로 검토한다.

## 6. 아직 확정하지 않은 항목

다음 항목은 Laravel 학습과 교수 피드백 후 결정할 설계 선택이다.

- 브라우저 기반 프로젝트에 Sanctum SPA 쿠키 인증을 쓸지 Bearer token을 쓸지
- UUID 버전과 데이터베이스 컬럼 타입
- 목록 페이지 크기와 정렬 쿼리 규칙
- 회원 이메일 인증·비밀번호 재설정 API 범위
- 작물 관리자 API와 권한 모델
- 일정·물주기·성장·수확 기록 API 구조
- 동시에 같은 격자를 수정할 때 버전 충돌 처리 방식

이 항목을 모른다고 문서가 실패한 것은 아니다. 미결정을 숨기지 않고 표시하는 것도 API 설계의 일부다.

## 7. 구현할 때 확인할 기준

- OpenAPI 명세와 Laravel 요청 검증 규칙이 같은가?
- 프론트 타입과 응답 스키마가 같은가?
- 모든 보호 API가 인증과 소유권을 각각 검사하는가?
- 정상 경로뿐 아니라 `401`, `403`, `404`, `409`, `422` 테스트가 있는가?
- 삭제와 수정이 실패했을 때 기존 데이터가 유지되는가?
- API 변경 시 `openapi.yaml`과 이 문서를 함께 수정했는가?

교수님께 설명할 때는 “화면이 데이터베이스에 직접 접근하지 않도록, Laravel과 주고받을 주소·입력·출력·오류를 미리 OpenAPI로 정의했다”고 요약할 수 있다.
