# 관리자 콘솔 기능 확장 계획

기준일: 2026-08-20. 1번은 구현을 마쳤고, 2번은 결정을 기다리는 항목입니다. 진행 상태는 [작업 목록](TASKS.md)을 따릅니다.

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

나중에 처리방침에 파기 조항이 추가되면 그때 익명화 마이그레이션을 별도 작업으로 추가합니다. 관리자가 다른 회원을 탈퇴시키는 기능은 아직 없습니다 — 필요해지면 위 `WithdrawAccount`를 재사용해 관리자 화면에서 호출하면 됩니다.

---

## 3. 닷홈 업로드 대상

1번을 운영에 반영할 때 FileZilla로 올릴 파일입니다. 마이그레이션과 `.env` 변경은 없습니다.

```text
app/Http/Controllers/Admin/AdminUserController.php   (수정)
public/assets/admin.css                              (수정)
resources/views/admin/users/index.blade.php          (수정)
resources/views/admin/users/show.blade.php           (신규)
routes/web.php                                       (수정)
```

`routes/web.php`를 바꾸므로, 업로드 후 상세 주소가 404면 [닷홈 배포 가이드](DOTHOME_DEPLOYMENT.md)의 캐시 정리 스크립트로 `route:clear`를 한 번 실행합니다. `admin.css`는 브라우저 캐시가 남을 수 있으니 강력 새로고침으로 확인합니다.
