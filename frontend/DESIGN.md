# 심어봄 웹앱 디자인 시스템

## 1. Atmosphere / signature

- `DESIGN_VARIANCE: 7`
- `MOTION_INTENSITY: 2`
- `VISUAL_DENSITY: 5`

Figma `홈 (전체)` 프레임과 시작 진단 레퍼런스의 야간 온실 풍경을 함께 기준으로 한다. 짙은 숲색 사진 위에 맑은 흰색 타이포를 얹고, 본문은 따뜻한 흰색 바탕과 선명한 에메랄드 한 색으로 연결한다. 시작 진단에서는 빈 받침대가 있는 실제 온실 사진, 입력값에 반응하는 WebGL 화분, 3D 치수 가이드와 전경 잎을 한 장면처럼 겹친다. 둥근 카드와 세로형 캡슐을 반복 모티프로 사용하되, 화면 전체가 카드 목록처럼 보이지 않게 사진과 비대칭 여백이 리듬을 만든다.

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
- `--color-planter-face: #26332E`: 화분의 기본 숲색 표면.
- `--color-planter-edge: #53645C`: WebGL 림과 모서리 하이라이트.
- `--color-planter-dark: #182B24`, `--color-planter-deep: #0B1B16`: WebGL 화분의 깊은 음영과 측면.
- `--color-planter-mid: #3F544B`, `--color-planter-highlight: #8B9B92`: PBR 림 베벨과 조명 면.
- `--color-planter-rib: #1D3128`, `--color-planter-rib-shadow: #0F211A`: 실제 반복 geometry로 만든 세로 골의 팔레트.

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
- Diagnosis stage: 화면 전체를 어두운 온실 사진으로 채우고 왼쪽의 한 패널만 입력 영역으로 사용한다. 첫 단계 패널은 밝은 종이 면이며 화면 왼쪽과 하단을 감싸는 비대칭 타원 곡선을 사용한다. 이후 단계는 짙은 반투명 면이다. 첫 단계 배경 사진에는 화분을 포함하지 않고, 오른쪽에 React Three Fiber `Canvas`를 투명하게 겹친다. 배경, 패널, 카메라와 제품은 포인터 위치에 반응하지 않으며 제품 중심과 카메라 target을 고정한다. drag, tilt, orbit, pan, wheel zoom을 모두 허용하지 않는다. 카메라 거리는 화분 개수별 고정 프리셋만 사용하며 가로·세로·깊이 입력에는 반응하지 않는다. 제품 조명은 별도 스튜디오처럼 밝게 분리하지 않고 온실 배경의 짙은 녹색 주변광, 낮은 노출, 부드러운 접촉 그림자에 맞춘다.
- Diagnosis first-stage frame: 첫 단계는 `--layout-diagnosis-max` 가운데 정렬을 적용하지 않고 뷰포트 전체 폭을 사용한다. 브랜드와 제목은 같은 화면 왼쪽 거터에서 시작하고, 밝은 곡선 패널은 화면 왼쪽과 하단 가장자리에 직접 닿아 데스크톱에서 검은 빈 세로 띠를 만들지 않는다. 투명 3D 뷰포트는 화면 오른쪽 가장자리에 고정하고 중심이 화면 너비의 70% 지점인 받침대 중앙과 일치하도록 데스크톱 너비를 60%로 둔다. 1025px 이상에서 브랜드 28px, 제목 56px, 설명 16px, 입력명 16px, 입력값 30px, 아이콘과 증감 버튼 52px, 하단 버튼 높이 64px를 사용한다.
- Diagnosis dimension planter: Blender에서 기준 크기 `0.60 × 0.20 × 0.25m`로 제작하고 내보낸 `planter-modular.glb`의 모듈을 React Three Fiber에서 조립한다. 고정 모서리, 림 모서리, 리브 폭과 벽 두께는 유지하고 중앙 벽·림 직선·바닥만 치수에 맞게 연장한다. 리브는 16~20mm 간격으로 개수와 위치를 다시 계산하며 옆으로 늘리지 않는다. 가로·세로·깊이 입력은 300ms ease-out 동안 실제 Mesh 위치와 모듈 치수를 보간한다. `MeshPhysicalMaterial`, ACES Filmic tone mapping, sRGB output, 환경 조명, key/fill/rim light, cast/receive shadow와 `ContactShadows`를 사용한다. 화분 수는 실제 Mesh 그룹을 최대 3개 생성하고 대표 화분만 3D 치수 가이드를 가진다. 모든 수량은 개수별 투영 Bounding Box 보정을 사용하지 않고 동일한 원점을 고정 중심으로 사용한다. 카메라 진행축 위치는 1·2개 `+0.48m`, 3개 `+0.62m`로 두어 1·2개만 3개보다 살짝 뒤에 배치한다. 카메라 거리 프리셋은 1개 `1.55`, 2개 `1.75`, 3개 `1.80`으로 고정한다. 1개는 원점의 큰 단독 제품샷, 2개는 같은 깊이에서 화면축 `±0.36m`의 좌우 대칭, 3개는 중앙 앞 1개와 화면축 `±0.43m`, 상대 깊이 `-0.42m`인 뒤 2개의 대칭 삼각 배치를 사용한다. 제품 뷰포트 너비가 640~899px인 중간 반응형 구간에서만 카메라 거리에 고정 배율 `1.22`를 적용해 768px 화면의 최대 가로 잘림을 방지한다.
- Diagnosis sunlight stage: 2단계는 `diagnosis-sunlight-greenhouse-v2.png`의 화분·받침대 없는 야간 온실을 배경으로 사용한다. 상단 아이보리 영역과 온실 장면은 파란 선이 들어간 비대칭 곡선으로 나누고, 제목 아래에는 카드나 폼 패널 없이 햇빛 시간과 배치 위치 radio를 글자와 세로 구분선만으로 배치한다. 미선택 글자는 회색이며 선택한 하나만 따뜻한 아이보리색, 금빛 glow, 그라데이션 밑줄로 강조한다. focus-visible은 `--color-focus`의 2px 링으로 선택 glow와 구분한다.
- Diagnosis crop stage: 3단계는 화분과 UI를 제거한 `garden-room-clean.webp`의 빈 목재 선반 위에 투명 React Three Fiber `Canvas`를 합성한다. 화분과 상추·방울토마토·바질·고추·시금치·딸기는 Blender에서 별도 실제 Mesh와 PBR 재질로 제작하고 GLB로 내보내 미리 로드한다. 각 작물 GLB의 `AN_IdleSway` Armature 애니메이션은 서로 다른 시작 위상과 속도로 재생한다. 카드, 하단 chip, 화분 안 표시 상태는 하나의 선택 배열을 공유하며 기본 선택은 상추와 바질이다. 3단계 화분과 흙은 1단계 치수와 분리해 Blender 원본 기준 `0.60 × 0.20 × 0.25m` 크기와 두께를 그대로 유지하고, 고정된 내부 공간의 정규화 슬롯에 1~6종을 배치한다. 화분과 PerspectiveCamera는 고정하고 orbit·zoom·pan·drag를 제공하지 않는다. 작물 등장·해제는 400~700ms 범위의 scale·opacity·Y 이동으로 처리한다.
- Diagnosis option: 다른 단계의 텍스트 선택지는 번호, 제목, 설명, 원형 체크를 한 행에 놓는다. hover는 `translateY(-4px)`, active는 `scale(0.98)`, focus는 `--color-focus`의 2px 링, disabled는 opacity 0.38이다.
- Diagnosis rail: 오른쪽에 1, 2, 3 세 개의 원형 단계 내비게이션만 두고 가는 진행선으로 연결한다. 분석과 결과는 3단계 이후의 후속 상태이며 별도 단계 원을 만들지 않는다. 완료 단계만 다시 열 수 있고 미완료 단계는 disabled 상태다. 모바일에서는 화면 아래 가로 레일로 전환한다.
- Diagnosis recommendation result: 3단계 생성 버튼 뒤의 분석 상태에서만 `diagnosis-result-greenhouse-v1.png` 배경을 사용하고, 결과는 화분 치수·개수와 햇빛 시간·위치만으로 결정한다. 3단계 관심 작물 배열은 결과 입력에 포함하지 않는다. 카드 수와 실제 화분 그룹 수는 선택 개수와 같으며, 하나의 공유 React Three Fiber `Canvas`와 `View`를 사용해 기존 planter·soil·crop GLB 및 애니메이션을 재사용한다. 1단계 화분 치수는 흙 양·추천 작물·모종 수 계산에만 사용하고 결과 카드의 화분 외형에는 적용하지 않는다. 결과 카드의 모든 3D 화분과 흙은 레퍼런스 기준 `60×25×20cm` 비율로 고정하며, 카메라도 전체 작물 중 가장 키 큰 작물을 기준으로 한 공통 거리와 가로 오프셋 `0`, 아래쪽 9° 구도를 사용해 입력 치수나 추천 조합이 달라도 화분의 화면 크기가 변하지 않게 한다. 작물은 원본 가로·깊이 배율을 유지하면서 세로축만 `1.14`배 보정하고, 카드의 3D 표시 영역을 설명 아래로 분리해 작물과 텍스트가 겹치지 않게 한다. 작물 수 말풍선은 실사 대신 작물별 투명 배경 플랫 2D 마크를 사용한다. 말풍선의 가로 위치는 작물 할당 폭의 중앙에서 좌우로 살짝 비켜 계산하고, 세로 위치는 작물 종류별 시각 높이에 맞춰 내려 배치한다. 연결선은 작물에서 말풍선 방향으로 한 번 꺾이며 화살표 머리를 말풍선 바로 아래에 두어 `3D 작물 → 말풍선` 방향을 나타낸다. 화분 1개 레이아웃은 넓어진 카드 폭에 맞는 별도 좌표 환산을 사용한다. 하단 흙·모종 표시도 실사·3D가 아닌 투명 배경 2D 마크를 사용한다. 추천 모종 수만큼 실제 작물 clone을 내부 격자에 배치하고, 계산된 흙 리터와 모종 합계는 입력 치수를 기준으로 유지한다. `다시 선택`은 입력과 관심 작물을 유지한 채 3단계로 돌아가며 `홈으로 들어가기`는 저장된 session 상태를 유지하고 홈으로 이동한다.
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
