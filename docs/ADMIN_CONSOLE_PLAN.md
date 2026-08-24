# 관리자 콘솔 기능 확장 계획

기준일: 2026-08-24. 1·2·4번은 구현을 마쳤습니다. 진행 상태는 [작업 목록](TASKS.md)을 따릅니다.

## 지금 있는 것

- 회원 목록: 검색(이메일·닉네임), 상태 필터, 20건 페이지네이션, 공간 수·소셜 계정 수 표시
- 회원 상태 변경: 활성 ↔ 비활성 (`app/Actions/Admin/ChangeMemberStatus.php`)
  - 본인 계정과 다른 관리자 계정은 변경 불가
  - 비활성화 시 세션과 API 토큰 종료
- 회원 상세 화면 (아래 1번)
- 운영 대시보드, 작물 기준정보 조회

---

## 1. 회원 상세 화면 — 완료 (2026-08-20)

`GET /admin/users/{user}`. 회원 목록의 닉네임을 누르면 열립니다. 마이그레이션 없이 조회 전용입니다.

### 보여 주는 것

- 상단 지표 5개: 재배 공간 수, 전체 시즌과 진행 중 시즌 수, 배치된 칸 수, 연결 소셜 계정, 마지막 기록 시각
- 왼쪽 패널: 공간마다 유형·크기·일조를 머리에 두고, 그 아래 시즌별로
  - 기간과 상태 배지(예정·진행 중·종료, `ResolveGrowingSeasonStatus` 기준)
  - 키우는 작물과 포기 수(격자 배치 기준, 없으면 대표 작물)
  - 격자 사용 현황 `4×6칸 중 3칸 사용 (50cm 격자)`
  - 일정 완료율, 기록 종류별 건수, 단위별 누적 수확량
- 오른쪽 패널: 계정 정보(닉네임·이메일·권한·상태·가입일·회원 ID)와 상태 변경 버튼

시즌 요약은 `App\Domain\Seasons\BuildSeasonSummary::for()`를 그대로 재사용합니다. 시즌마다 요약 쿼리를 다시 돌지만 관리자 한 명이 보는 화면이라 그대로 두었습니다(컨트롤러에 `ponytail:` 주석으로 표시). 작물 이름은 배치와 대표 작물의 ID를 모아 `Crop` 테이블에서 한 번에 조회합니다.

### 관련 파일

```text
routes/web.php                                       users.show 라우트
app/Http/Controllers/Admin/AdminUserController.php   show()
resources/views/admin/users/show.blade.php           상세 화면
resources/views/admin/users/index.blade.php          닉네임 → 상세 링크
public/assets/admin.css                              .space-block, .season-block, .status.planned/.completed
tests/Feature/Admin/AdminUserDetailTest.php          권한·표시 내용·빈 회원
```

---

## 2. 회원 탈퇴 — 비활성화 유지로 결정 (2026-08-20)

회원을 그냥 지우면 `growing_spaces` → `growing_seasons` → `cultivation_records`·`cultivation_tasks`·`garden_layouts`·`watering_schedules`가 전부 따라 지워지고 되돌릴 수 없어, 세 가지 방식 중 하나를 골라야 했습니다.

| 방식 | 하는 일 | 장점 | 단점 |
| --- | --- | --- | --- |
| **비활성화 유지 (채택)** | 로그인만 막음 | 데이터 보존, 복구 쉬움 | 개인정보 삭제 요구에 대응 못 함 |
| Soft delete | `users.deleted_at` 추가, 데이터는 남김 | 실수 복구 가능 | 개인정보(이메일·닉네임)가 남음 |
| 익명화 후 비활성화 | 이메일·닉네임을 익명값으로 바꾸고 소셜 연결 해제, 재배 데이터는 남김 | 개인정보 삭제 + 통계 보존 | 되돌릴 수 없음, 마이그레이션 필요 |

개인정보 처리방침에 탈퇴 시 즉시 파기를 약속한 적이 없으므로 **비활성화 유지**를 채택했습니다. 회원 본인이 `DELETE /me`로 탈퇴하면 계정 상태가 `disabled`로 바뀌고 세션·API 토큰이 즉시 종료됩니다(구현: `App\Actions\Auth\WithdrawAccount`, `App\Http\Controllers\Api\V1\Auth\WithdrawAccountController`). 재배 데이터는 지우지 않습니다.

나중에 처리방침에 파기 조항이 추가되면 그때 익명화 마이그레이션을 별도 작업으로 추가합니다.

**관리자가 다른 회원을 탈퇴 처리하는 기능은 2026-08-24에 추가했습니다** (아래 4번). `WithdrawAccount`를 새로 호출하는 대신 기존 `ChangeMemberStatus`를 그대로 재사용했습니다 — 본인 계정 변경 금지, 다른 관리자 계정 변경 금지 가드가 이미 있고 동작이 완전히 동일(상태를 `disabled`로, 세션·토큰 종료, 데이터 보존)하기 때문입니다. 화면에서는 "비활성화"가 아니라 "탈퇴 처리"로 표기해 실제 정책과 용어를 맞췄고, 활성 회원을 대상으로 할 때만 브라우저 `confirm()`으로 한 번 더 확인합니다.

---

## 3. 닷홈 업로드 대상

1·4번을 운영에 반영할 때 FileZilla로 올릴 파일입니다. 마이그레이션과 `.env` 변경은 없습니다.

```text
app/Http/Controllers/Admin/AdminUserController.php   (수정)
public/assets/admin.css                              (수정)
resources/views/admin/auth/login.blade.php           (수정)
resources/views/admin/users/index.blade.php           (수정)
resources/views/admin/users/show.blade.php           (수정)
routes/web.php                                       (수정)
```

`routes/web.php`를 바꾸므로, 업로드 후 상세 주소가 404면 [닷홈 배포 가이드](DOTHOME_DEPLOYMENT.md)의 캐시 정리 스크립트로 `route:clear`를 한 번 실행합니다. `admin.css`는 브라우저 캐시가 남을 수 있으니 강력 새로고침으로 확인합니다.

---

## 4. 회원 상세 화면 보강 — 완료 (2026-08-24)

회원 상세 화면(1번)이 요약 숫자만 보여주고, 실제로 어떤 작물을 어디에 배치했는지·회원이 남긴 메모에 뭐가 적혀 있는지는 전혀 보여주지 않았습니다. 세 가지를 추가했습니다.

- **격자 배치 시각화**: 요약 문구(`4×6칸 중 3칸 사용`) 아래에 실제 격자를 렌더링합니다. `cell_index = row * columns + col`로 좌표를 복원해 CSS grid로 그리고, 칸에 작물 이름 첫 글자를 표시하고 hover 시 `N행 M열 · 작물명`을 보여줍니다. 이미 로드되어 있는 `season.layout.placements` 데이터만 쓰므로 추가 쿼리가 없습니다.
- **메모 노출**: 공간(`growing_spaces.notes`), 시즌(`growing_seasons.notes`), 완료 여부와 무관한 재배 일정(`cultivation_tasks.notes`), 재배 기록(`cultivation_records.notes`), 물주기 기록(`watering_logs.memo`) 중 빈 문자열이 아닌 것만 모아 시즌별로 보여줍니다. 컨트롤러의 `growingSpaces.seasons` 즉시 로딩에 `.tasks`, `.records`, `.wateringSchedules.logs`를 추가했습니다.
- **관리자 탈퇴 처리**: 위 2번 참고. 회원 목록과 상세 화면 양쪽의 상태 변경 버튼을 "탈퇴 처리"/"탈퇴 철회"로 바꾸고 활성 회원을 탈퇴 처리할 때 확인 대화상자를 띄웁니다.

동시에 `admin.css`와 로그인 화면을 다시 손봤습니다. 기존 화면이 소비자용 랜딩 페이지처럼 둥근 모서리·그라데이션·스톡 사진을 쓰고 있어 운영 도구라는 느낌이 약했습니다. 모서리를 좁히고(6-10px), 그림자 대신 테두리로 구분하고, 카드형 그라데이션과 로그인 화면의 배경 사진을 없애고, ID·타임스탬프·수치에 모노스페이스 폰트를 적용했습니다. 색상 변수 이름(`--leaf`, `--ink` 등)과 클래스 이름은 대부분 유지해 기존 뷰가 그대로 동작하도록 했습니다.

### 관련 파일

```text
app/Http/Controllers/Admin/AdminUserController.php   show() 즉시 로딩에 tasks/records 추가
resources/views/admin/users/show.blade.php           격자 시각화, 메모, 탈퇴 처리 버튼
resources/views/admin/users/index.blade.php          탈퇴 처리/탈퇴 철회 문구, 확인 대화상자
resources/views/admin/auth/login.blade.php           스톡 사진 제거, 단일 카드 레이아웃
public/assets/admin.css                               전체 재작성 — 운영 도구 톤
tests/Feature/Admin/AdminConsoleTest.php              기존 통과 확인(문구 assertSee 없음)
tests/Feature/Admin/AdminUserDetailTest.php           기존 통과 확인(요약 문구는 그대로 유지)
```
