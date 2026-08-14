# 심어봄 웹앱 디자인 시스템

## 1. Atmosphere / signature

Figma `홈 (전체)` 프레임과 시작 진단 레퍼런스의 야간 온실 풍경을 함께 기준으로 한다. 짙은 숲색 사진 위에 맑은 흰색 타이포를 얹고, 본문은 따뜻한 흰색 바탕과 선명한 에메랄드 한 색으로 연결한다. 시작 진단에서는 실제 화분 사진, 치수 가이드, 반투명 잎 그림자, 카메라 원근 반응을 한 장면처럼 겹친다. 둥근 카드와 세로형 캡슐을 반복 모티프로 사용하되, 화면 전체가 카드 목록처럼 보이지 않게 사진과 비대칭 여백이 리듬을 만든다.

## 2. Color

- `--color-page: #FFFFFF`: 기본 페이지와 카드 배경.
- `--color-surface: #F8F9F4`: 흐린 정보 영역 배경.
- `--color-surface-warm: #FFF8EF`: 다음 단계 안내 영역 배경.
- `--color-ink: #173A30`: 제목과 본문 전경색. 순수 검정 대신 사용한다.
- `--color-ink-strong: #102A22`: 사진 위를 제외한 가장 강한 제목색.
- `--color-muted: #6C7973`: 보조 본문과 메타데이터.
- `--color-primary: #0C9769`: Figma 주조색, CTA와 강조 텍스트.
- `--color-primary-hover: #087D57`: primary hover/active.
- `--color-primary-soft: #E4F3ED`: 아이콘 원형, 선택 배경.
- `--color-secondary: #46B18D`: 진행 상태와 보조 강조.
- `--color-accent: #FFC283`: 햇빛/작업 아이콘과 작은 포인트.
- `--color-border: #E3E8E4`: 카드·내비게이션 경계.
- `--color-on-photo: #FFFFFF`: 어두운 사진 위 텍스트.
- `--color-overlay: #0B2118`: 사진 가독성 오버레이의 기준색.
- `--color-danger: #B84C42`: 오류 상태.
- `--color-danger-soft: #FBEFED`: 오류 안내의 옅은 배경.
- `--color-focus: #0C9769`: 포커스 링.
- `--color-forest-deep: #071F17`: 시작 진단과 사진형 헤더의 가장 어두운 배경.
- `--color-forest-panel: #102B21`: 어두운 화면 위 입력 패널.
- `--color-shell: #F4F2EB`: 운영 화면의 바깥 배경.
- `--color-panel: #FFFDF8`: 운영 화면 카드와 편집 패널.
- `--color-soil-dark: #594535`: 텃밭 테두리와 흙의 어두운 층.
- `--color-soil: #81664C`: 텃밭 흙 바탕.
- `--color-sage: #DCE8C9`: 잎채소 배치 칸.
- `--color-sage-strong: #83A85D`: 잎채소 배치 강조.
- `--color-warning: #D28A43`: 주의 상태와 열매채소 배치 강조.
- `--color-warning-soft: #FAEFE1`: 주의 상태의 옅은 배경.
- `--color-forest-night: #03130E`: 시작 진단 사진 바깥과 가장 깊은 그림자.
- `--color-forest-mist: #B8D8C7`: 어두운 화면의 보조 설명과 치수선.
- `--color-leaf-bright: #73D6A2`: 선택 표시와 살아 있는 잎의 밝은 포인트.
- `--color-sunbeam: #F1CF83`: 온실 조명, 햇빛 수치, 작은 광원 포인트.
- `--color-planter-face: #26332E`: CSS 화분 모형의 전면.
- `--color-planter-edge: #53645C`: CSS 화분 모형의 상단과 모서리.

본문/배경과 primary/흰색 조합은 일반 텍스트 4.5:1, 큰 텍스트와 UI 3:1을 기준으로 사용한다. `#46B18D`와 `#FFC283`은 큰 텍스트 또는 장식에만 쓴다.

## 3. Typography

- 기본 스택 `Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif`.
- `--type-display`: 48px, 700, line-height 1.16, letter-spacing -0.04em.
- `--type-h1-mobile`: 40px, 700, line-height 1.18, letter-spacing -0.04em.
- `--type-h2`: 32px, 700, line-height 1.2, letter-spacing -0.035em.
- `--type-h3`: 24px, 700, line-height 1.28, letter-spacing -0.025em.
- `--type-body-lg`: 18px, 400, line-height 1.65, letter-spacing -0.01em.
- `--type-body`: 16px, 400, line-height 1.6, letter-spacing -0.01em.
- `--type-label`: 14px, 600, line-height 1.4, letter-spacing -0.01em.
- `--type-caption`: 12px, 500, line-height 1.45, letter-spacing 0.
- `--type-display-compact`: 40px, 700, line-height 1.14, letter-spacing -0.04em.
- `--type-h2-compact`: 28px, 700, line-height 1.24, letter-spacing -0.035em.
- `--type-body-sm`: 14px, 400, line-height 1.55, letter-spacing -0.01em.
- `--type-micro`: 10px, 600, line-height 1.4, letter-spacing 0.
- `--type-display-hero`: 56px, 700, line-height 1.08, letter-spacing -0.045em.
- `--type-title-sm`: 22px, 700, line-height 1.28, letter-spacing -0.025em.
- `--type-stat`: 30px, 700, line-height 1, letter-spacing -0.035em.
- `--type-kicker`: 11px, 700, line-height 1.4, letter-spacing 0.08em.

## 4. Spacing

기본 단위는 4px이다.

- `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`.
- `--space-5: 20px`, `--space-6: 24px`, `--space-7: 28px`, `--space-8: 32px`, `--space-10: 40px`.
- `--space-12: 48px`, `--space-16: 64px`, `--space-20: 80px`, `--space-24: 96px`.
- `--space-14: 56px`, `--space-18: 72px`, `--space-28: 112px`, `--space-30: 120px`, `--space-36: 144px`.
- 콘텐츠 최대 폭 `--layout-max: 1160px`, 본문 거터 `--layout-gutter: 24px`.
- 운영 화면 최대 폭 `--layout-app-max: 1440px`, 상세 편집 본문 폭 `--layout-editor-max: 1180px`.
- 시작 진단 최대 폭 `--layout-diagnosis-max: 1520px`, 질문 폭 `--layout-question-max: 560px`, 결과 폭 `--layout-result-max: 980px`.
- 컨트롤 높이 `--control-sm: 36px`, `--control-md: 44px`, `--control-lg: 52px`, `--control-xl: 56px`.
- 모서리는 `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-xl: 24px`, `--radius-2xl: 32px`, `--radius-portal: 64px`, `--radius-pill: 999px`만 사용한다.
- 선 굵기는 `--line-thin: 1px`, `--line-focus: 2px`, `--line-strong: 4px`를 사용한다.

## 5. Components

- Header: 높이 72px, 사진 위에서는 투명, 스크롤 이후에도 텍스트 대비를 유지한다. 링크는 14px/600. hover는 opacity와 primary-soft 밑줄, focus는 2px ring과 4px offset.
- Primary button: primary 배경, 흰색 텍스트, 16px/700, 수평 24px, 수직 14px, radius 999px. hover는 primary-hover, active는 scale 0.98, disabled는 opacity 0.45.
- Icon button: 40px 정사각, radius 999px, 투명 배경. hover는 흰색 12% 또는 primary-soft, focus는 동일한 ring.
- Photo card: radius 24px, overflow hidden. 사진은 실제 Figma 에셋을 사용하고 텍스트 대비용 그라디언트만 허용한다.
- Progress card: page 배경, border 1px, radius 24px. 값은 primary, 트랙은 primary-soft, 완료는 secondary.
- Task row: 최소 높이 56px, 아이콘 원형 40px, 행 사이 구분선. hover는 surface, focus-within은 ring.
- Recommendation card: 사진 상단, 정보 하단, radius 16px, border 1px. 링크 전체가 클릭되며 hover 시 translateY(-4px), active 시 translateY(0).
- Empty/loading/error: empty는 surface 배경과 설명+CTA, loading은 surface/primary-soft skeleton, error는 danger 텍스트와 재시도 CTA.
- Diagnosis stage: 화면 전체를 어두운 온실 사진으로 채우고 왼쪽의 한 패널만 입력 영역으로 사용한다. 첫 단계 패널은 밝은 종이 면, 이후 단계는 짙은 반투명 면이다. 오른쪽 화분은 치수선과 상태 HUD가 겹쳐진 실제 사진을 사용하며 포인터에 따라 배경과 가이드가 서로 다른 속도로 움직인다. 단계 이동 시 패널과 장면은 opacity, transform, filter로만 전환한다.
- Diagnosis option: 사진 선택지는 실제 작물 사진을 쓰며 2열 비대칭 그리드로 배치한다. 텍스트 선택지는 번호, 제목, 설명, 원형 체크를 한 행에 놓는다. hover는 `translateY(-4px)`, active는 `scale(0.98)`, focus는 `--color-focus`의 2px 링, disabled는 opacity 0.38이다.
- Diagnosis rail: 오른쪽에 세로 원형 단계 내비게이션을 둔다. 완료 단계만 다시 열 수 있고 미완료 단계는 disabled 상태다. 모바일에서는 화면 아래 가로 레일로 전환한다.
- Planter model: 결과 카드 안에서는 실제 작물 사진 아래에 `--color-planter-face` 전면과 `--color-planter-edge` 상단을 겹쳐 화분 깊이를 만든다. 모형은 장식이며 텍스트나 입력을 흉내 내지 않는다.
- Garden bed: 흙색의 두꺼운 테두리 안에 작물 원형 또는 사진을 배치한다. 모바일은 요약 배치, 데스크톱은 왼쪽 작물 목록·중앙 격자·오른쪽 속성 패널의 3영역 편집기로 전환한다.
- App footer: primary 배경, 사진형 CTA 다음에 붙이며 네 열 정보 구조를 유지한다.

## 6. Motion

- `--motion-fast: 160ms`, `--motion-base: 220ms`, `--motion-slow: 360ms`.
- 장면 호흡 `--motion-drift: 8000ms`, 단계 장면 전환 `--motion-scene: 520ms`.
- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`.
- `--ease-scene: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-linear: linear`.
- hover/press는 transform과 opacity만 사용한다. 이미지 확대는 최대 1.025.
- `prefers-reduced-motion: reduce`에서는 transform 기반 이동과 부드러운 스크롤을 끄고 상태 변화는 즉시 반영한다.

## 7. Depth

경계선과 사진의 명암 대비를 기본으로 하고 그림자는 두 단계만 쓴다.

- `--shadow-sm: 0 1px 2px rgba(23, 58, 48, 0.06), 0 8px 24px rgba(23, 58, 48, 0.06)`.
- `--shadow-md: 0 2px 8px rgba(23, 58, 48, 0.08), 0 20px 56px rgba(23, 58, 48, 0.12)`.
- `--shadow-panel: 0 24px 80px rgba(3, 19, 14, 0.28)`.
- `--shadow-planter: 0 32px 72px rgba(3, 19, 14, 0.52)`.
- 장면 원근 `--perspective-scene: 1200px`, 패널 흐림 `--blur-panel: 20px`.
- 동일 화면에서 shadow와 무거운 테두리를 동시에 사용하지 않는다.

## Do / Don't

- Figma의 에메랄드, 둥근 날짜 캡슐, 온실 사진을 화면의 서명으로 유지한다.
- 사진 위 텍스트는 항상 충분한 오버레이 대비를 확보한다.
- 아이콘에 이모지를 쓰거나 임의의 SVG path를 만들지 않는다.
- 대칭 3열 기능 카드, 보라색 글로우, 베이지+황동 조합, 장식성 상태 점을 추가하지 않는다.
