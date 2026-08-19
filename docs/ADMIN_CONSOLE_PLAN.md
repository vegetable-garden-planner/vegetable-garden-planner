# 관리자 콘솔 기능 확장 계획

기준일: 2026-08-19. 아직 구현하지 않은 계획 문서입니다. 진행 상태는 [작업 목록](TASKS.md)을 따릅니다.

## 지금 있는 것

- 회원 목록: 검색(이메일·닉네임), 상태 필터, 20건 페이지네이션, 공간 수·소셜 계정 수 표시
- 회원 상태 변경: 활성 ↔ 비활성 (`app/Actions/Admin/ChangeMemberStatus.php`)
  - 본인 계정과 다른 관리자 계정은 변경 불가
  - 비활성화 시 세션과 API 토큰 종료
- 운영 대시보드, 작물 기준정보 조회

## 없는 것

회원을 눌러도 그 회원이 **무엇을 키우는지** 볼 수 없습니다. 목록에 공간 개수만 있고 상세가 없어서, 문의가 들어왔을 때 어떤 공간에 어떤 작물을 어떻게 배치했는지 확인할 방법이 없습니다.

---

## 1. 회원 상세 화면 (먼저 할 것)

마이그레이션 없음. 조회 전용이라 위험도 낮습니다.

### 라우트

`routes/web.php`의 admin 그룹 안에 한 줄 추가합니다.

```php
Route::get('/users/{user}', [AdminUserController::class, 'show'])->name('users.show');
```

목록 화면(`resources/views/admin/users/index.blade.php`)의 닉네임을 이 라우트로 링크합니다.

### 컨트롤러

`AdminUserController::show(User $user)`에서 조회할 것:

```php
$user->load([
    'growingSpaces' => fn ($q) => $q->withCount('seasons')->latest(),
    'growingSpaces.seasons' => fn ($q) => $q->latest('start_date'),
    'growingSpaces.seasons.layout',
]);
```

- 공간별: 유형(실내/베란다/마당), 크기, 일조, 연결 시즌 수
- 시즌별: 이름, 기간, 상태(`ResolveGrowingSeasonStatus::for()` 재사용), 대표 작물
- 배치: 격자 크기(`columns × rows`), 배치된 칸 수, 작물별 포기 수
  - 작물명은 `Crop` 모델에서 `whereIn('id', $cropIds)`로 한 번에 조회해 매핑 (N+1 주의)
- 일정·기록 요약은 이미 만든 `App\Domain\Seasons\BuildSeasonSummary::for($season)`를 그대로 씁니다. 새로 짜지 말 것.

### 뷰

`resources/views/admin/users/show.blade.php`. 새 CSS 없이 기존 클래스를 재사용합니다.

- 상단: `.metrics` + `.metric` — 공간 수, 시즌 수, 배치 수, 마지막 활동일
- 본문: 공간마다 `.panel` 하나, 그 안에 시즌 목록을 `.operations-list`(dl) 로
- 배치가 있는 시즌은 격자 요약 한 줄: `8 × 6칸 · 12칸 배치 · 감자 8, 고추 4`

기존 관리자 콘솔은 이미 밀도 높은 운영 콘솔 문법(지표 카드 → 심각도 알림 → 데이터 목록)을 쓰고 있으므로 그 톤을 유지합니다. 프론트의 사진 히어로·큰 여백은 가져오지 않습니다.

### 테스트

`tests/Feature/Admin/` 에 추가:

- 비관리자는 403
- 관리자는 다른 회원의 공간·시즌·배치를 볼 수 있다
- 공간이 없는 회원도 오류 없이 빈 화면을 본다

---

## 2. 회원 탈퇴 — 구현 전에 결정 필요

**결정 전에는 만들지 않습니다.** 회원을 그냥 지우면 `growing_spaces` → `growing_seasons` → `cultivation_records`·`cultivation_tasks`·`garden_layouts`·`watering_schedules`가 전부 따라 지워지고 되돌릴 수 없습니다.

세 가지 중 하나를 골라야 합니다.

| 방식 | 하는 일 | 장점 | 단점 |
| --- | --- | --- | --- |
| 비활성화 유지 | 지금 이미 있음. 로그인만 막음 | 데이터 보존, 복구 쉬움 | 개인정보 삭제 요구에 대응 못 함 |
| Soft delete | `users.deleted_at` 추가, 데이터는 남김 | 실수 복구 가능 | 개인정보(이메일·닉네임)가 남음 |
| 익명화 후 비활성화 | 이메일·닉네임을 익명값으로 바꾸고 소셜 연결 해제, 재배 데이터는 남김 | 개인정보 삭제 + 통계 보존 | 되돌릴 수 없음, 마이그레이션 필요 |

개인정보 처리방침에 회원 탈퇴를 이미 적어 두었다면 **익명화**가 그 약속에 맞습니다. 지금은 그런 요구가 없으므로 **비활성화 유지**로 두는 것이 가장 안전합니다.

어느 쪽이든 결정되면 그때 별도 작업으로 진행합니다. 관리자가 회원을 지우는 기능보다, 회원 본인이 탈퇴하는 기능이 먼저 필요할 수도 있습니다(`docs/PROJECT_STATUS.md`의 "MVP 후속 · 비밀번호 재설정, 회원 탈퇴와 개인정보 처리" 항목).

---

## 3. 닷홈 업로드 대상

1번만 구현했을 때 FileZilla로 올릴 파일입니다. 마이그레이션과 `.env` 변경은 없습니다.

```text
app/Http/Controllers/Admin/AdminUserController.php   (수정)
resources/views/admin/users/index.blade.php          (수정, 상세 링크)
resources/views/admin/users/show.blade.php           (신규)
routes/web.php                                       (수정)
```

`routes/web.php`를 바꾸므로, 업로드 후 상세 주소가 404면 [닷홈 배포 가이드](DOTHOME_DEPLOYMENT.md)의 캐시 정리 스크립트로 `route:clear`를 한 번 실행합니다.
