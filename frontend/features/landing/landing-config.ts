/**
 * 랜딩 페이지 설정
 *
 * 이동 경로와 미디어 경로를 한곳에 모아 둔다.
 */

/**
 * 시작하기 · 심어보기 버튼이 향하는 경로
 *
 * 기존 서비스의 시작 진단 플로우(GuestGate + DiagnosisForm)를 그대로 쓴다.
 * 랜딩에서 새 시작 화면을 만들지 않는다.
 */
export const START_PATH = "/start";

/**
 * 히어로 배경 미디어
 *
 * 우선순위
 *   1) heroVideoWebm 또는 heroVideoMp4 가 있고, 데스크톱이며,
 *      모션 최소화 설정이 아니면 → 영상 재생
 *   2) 그 외에는 heroPoster 이미지 표시
 *   3) 둘 다 비어 있으면 → 짙은 녹색 그라디언트만 사용 (지금도 완성된 화면)
 *
 * 영상은 필수가 아니다. 지금은 정적 이미지만 사용한다.
 *
 * 파일 위치
 *   public/videos/landing/hero.webm
 *   public/videos/landing/hero.mp4
 *   public/images/landing/hero.jpg   ← 영상의 첫 프레임과 같은 장면이면 가장 자연스럽다
 *
 * 영상 권장 사양: 6~10초 무한 루프 · 소리 없음 · 가로 1600px · 2MB 이하
 */
export const LANDING_MEDIA = {
  heroVideoWebm: "",
  heroVideoMp4: "",
  heroPoster: "/images/landing/hero-window.jpg",
  /**
   * 사진에서 화면에 남길 부분 (background-position)
   * 창틀이 가로지르는 가운데 띠가 화면에 남도록 잡는다.
   */
  heroPosterPosition: "50% 54%",
} as const;

/** 히어로에 실제 사진·영상이 있는지 — 오버레이 세기를 조절하는 데 쓴다 */
export const HAS_HERO_MEDIA = Boolean(
  LANDING_MEDIA.heroPoster ||
    LANDING_MEDIA.heroVideoWebm ||
    LANDING_MEDIA.heroVideoMp4
);

/**
 * 그 밖의 랜딩 이미지
 *
 * question — 두 번째 장면 배경에 아주 옅게 깔린다 (가로형, 2000px 이상 권장)
 * 비어 있으면 그라디언트만 사용한다.
 */
export const LANDING_IMAGES = {
  question: "",
} as const;

/**
 * 히어로 마우스 리빌
 *
 * 같은 창틀을 찍은 두 장이다. 크기·크롭·위치가 완전히 같아야 겹쳤을 때
 * 어긋나지 않는다. (둘 다 1672 × 941)
 *
 *   base    창틀이 비어 있는 상태 — 처음 보이는 화면
 *   planted 상추와 허브가 심긴 상태 — 커서 주변에서만 드러난다
 */
export const HERO_REVEAL = {
  base: "/images/landing/hero-window.jpg",
  planted: "/images/landing/hero-window-planted.jpg",
  /** 두 장에 똑같이 적용한다 */
  position: "50% 54%",
} as const;
