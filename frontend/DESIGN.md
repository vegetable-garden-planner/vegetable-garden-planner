# 심어봄 웹 디자인 시스템

## 1. Atmosphere / signature

Figma `홈 (전체)`, `화분 배치·재배 계획`, `화분 배치 조정` 프레임의 온실 아침 풍경과 정돈된 작업대를 기준으로 한다. 짙은 숲색 사진 위에 맑은 흰색 타이포를 얹고, 관리 화면은 따뜻한 흰색 바탕·얇은 회색 경계·선명한 에메랄드로 연결한다. 사진이 주인공인 요약 화면과 정보 밀도가 높은 작업 화면을 구분하며, 기능을 실제 데이터 구조보다 과장해 표현하지 않는다.

## 2. Color

- `--color-page: #FFFFFF`: 기본 페이지와 카드 배경.
- `--color-surface: #F7F5EF`: 흐린 정보 영역과 페이지 그라디언트 배경.
- `--color-surface-warm: #FBF6ED`: 다음 단계 안내 영역 배경.
- `--color-ink: #1C3029`: 제목과 본문 전경색. 순수 검정 대신 사용한다.
- `--color-ink-strong: #17251F`: 사진 위를 제외한 가장 강한 제목색.
- `--color-muted: #6F7772`: 보조 본문과 메타데이터.
- `--color-primary: #079568`: Figma 주조색, CTA와 강조 텍스트.
- `--color-primary-hover: #087653`: primary hover/active.
- `--color-primary-soft: #E9F5F0`: 아이콘 원형, 선택 배경.
- `--color-secondary: #46B18D`: 진행 상태와 보조 강조.
- `--color-accent: #FFC283`: 햇빛/작업 아이콘과 작은 포인트.
- `--color-border: #E8E4DC`: 카드·내비게이션 경계.
- `--color-on-photo: #FFFFFF`: 어두운 사진 위 텍스트.
- `--color-overlay: #0B2118`: 사진 가독성 오버레이의 기준색.
- `--color-danger: #B84C42`: 오류 상태.
- `--color-focus: #0C9769`: 포커스 링.

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

## 4. Spacing

기본 단위는 4px이다.

- `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`.
- `--space-5: 20px`, `--space-6: 24px`, `--space-8: 32px`, `--space-10: 40px`.
- `--space-12: 48px`, `--space-16: 64px`, `--space-20: 80px`, `--space-24: 96px`.
- `--space-30: 120px`, `--space-36: 144px`.
- 콘텐츠 최대 폭 `--layout-max: 1320px`, 본문 거터 `--layout-gutter: 24px`.

## 5. Components

- Header: 높이 72px, 사진 위에서는 투명, 스크롤 이후에도 텍스트 대비를 유지한다. 링크는 14px/600. hover는 opacity와 primary-soft 밑줄, focus는 2px ring과 4px offset.
- App header: 내부 화면에서는 화면 폭 전체의 흰색 반투명 상단 바와 얇은 하단 경계를 사용한다. 브랜드는 에메랄드, 중앙 메뉴는 짙은 회색, 검색과 계정 작업은 오른쪽에 둔다. 모바일 내비게이션은 한 줄 스크롤을 유지하되 스크롤바는 노출하지 않는다.
- App page: `AppPageShell`을 단일 기준으로 사용한다. 일반 관리 화면은 넉넉한 제목 여백 뒤에 기능 콘텐츠를 배치하고, 핵심 요약 화면은 `heroImage`로 사진 히어로를 사용할 수 있다.
- Surface panel: 검색, 폼, 요약처럼 여러 입력을 묶는 영역은 흰색 배경, border 1px, radius 20px, `--shadow-sm`을 사용한다. 기능 컴포넌트가 각자 별도 페이지 배경을 만들지 않는다.
- Planner workspace: 마당·텃밭 배치는 데스크톱에서 작물 선택 / 흙 격자 보드 / 수량·가이드의 3열 구조를 사용한다. 태블릿 이하에서는 작물 선택을 가로 목록으로 바꾸고 보드와 정보를 세로로 쌓는다. 화분·베란다는 이 격자를 재사용하지 않고 대표 작물 선택과 일정 흐름을 같은 시각 언어로 표시한다.
- Form control: 높이 48px 이상, 16px 안팎 radius, 흰색 배경과 border를 기본으로 하며 focus는 primary ring으로 표시한다.
- Auth page: 데스크톱에서는 온실 사진과 폼을 1:1로 나눈 패널, 모바일에서는 폼을 우선 노출한다. 이미지 위 문구에는 overlay를 둔다.
- Primary button: primary 배경, 흰색 텍스트, 16px/700, 수평 24px, 수직 14px, radius 999px. hover는 primary-hover, active는 scale 0.98, disabled는 opacity 0.45.
- Icon button: 40px 정사각, radius 999px, 투명 배경. hover는 흰색 12% 또는 primary-soft, focus는 동일한 ring.
- Photo card: radius 24px, overflow hidden. 사진은 실제 Figma 에셋을 사용하고 텍스트 대비용 그라디언트만 허용한다.
- Progress card: page 배경, border 1px, radius 24px. 값은 primary, 트랙은 primary-soft, 완료는 secondary.
- Task row: 최소 높이 56px, 아이콘 원형 40px, 행 사이 구분선. hover는 surface, focus-within은 ring.
- Recommendation card: 사진 상단, 정보 하단, radius 16px, border 1px. 링크 전체가 클릭되며 hover 시 translateY(-4px), active 시 translateY(0).
- Empty/loading/error: empty는 surface 배경과 설명+CTA, loading은 surface/primary-soft skeleton, error는 danger 텍스트와 재시도 CTA.

## 6. Motion

- `--motion-fast: 160ms`, `--motion-base: 220ms`, `--motion-slow: 360ms`.
- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`.
- hover/press는 transform과 opacity만 사용한다. 이미지 확대는 최대 1.025.
- `prefers-reduced-motion: reduce`에서는 transform 기반 이동과 부드러운 스크롤을 끄고 상태 변화는 즉시 반영한다.

## 7. Depth

경계선과 사진의 명암 대비를 기본으로 하고 그림자는 두 단계만 쓴다.

- `--shadow-sm: 0 1px 2px rgba(23, 58, 48, 0.06), 0 8px 24px rgba(23, 58, 48, 0.06)`.
- `--shadow-md: 0 2px 8px rgba(23, 58, 48, 0.08), 0 20px 56px rgba(23, 58, 48, 0.12)`.
- 동일 화면에서 shadow와 무거운 테두리를 동시에 사용하지 않는다.

## Do / Don't

- Figma의 에메랄드, 둥근 날짜 캡슐, 온실 사진을 화면의 서명으로 유지한다.
- 작물 실사 자산은 `public/figma`의 기존 사진을 우선 재사용하고, 없는 작물은 카테고리 색과 한글 첫 글자로 일관되게 대체한다.
- 사진 위 텍스트는 항상 충분한 오버레이 대비를 확보한다.
- 아이콘에 이모지를 쓰거나 임의의 SVG path를 만들지 않는다.
- 대칭 3열 기능 카드, 보라색 글로우, 베이지+황동 조합, 장식성 상태 점을 추가하지 않는다.
