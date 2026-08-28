/**
 * 작물 도감에서 쓰는 사진 / 아이콘 asset 표
 *
 * 두 가지를 구분한다.
 *  - CROP_PHOTOS  : 가로로 긴 실사 사진. 카드 썸네일과 상세 히어로처럼 큰 영역에 쓴다.
 *  - CROP_ICONS   : 배경을 뗀 정사각 컷. 목록 옆 작은 원형 표시에 쓴다.
 *
 * 사용자가 직접 제공한 asset 만 쓴다. 없는 작물은 빌려 오지 않고 이름 첫 글자로 대신한다.
 */

/** 도감 카드 / 상세 히어로용 실사 사진 (1200px 폭 webp) */
export const CROP_PHOTOS: Readonly<Partial<Record<string, string>>> = {
  potato: "/crops/photo/potato.webp",
  lettuce: "/figma/image3.webp",
  "kidney-bean": "/crops/photo/kidney-bean.webp",
  "young-radish": "/crops/photo/young-radish.webp",
  spinach: "/crops/photo/spinach.webp",
  "green-onion": "/crops/photo/green-onion.webp",
  carrot: "/crops/photo/carrot.webp",
  tomato: "/figma/image7.webp",
  cucumber: "/crops/photo/cucumber.webp",
  pepper: "/crops/photo/pepper.webp",
  "cherry-tomato": "/crops/photo/cherry-tomato.webp",
  basil: "/crops/photo/basil.webp",
  strawberry: "/crops/photo/strawberry.webp",
  "gift-bouquet": "/crops/photo/gift-bouquet.webp",
  "moth-orchid": "/crops/photo/moth-orchid.webp",
  "african-violet": "/crops/photo/african-violet.webp",
};

/** 작은 원형 표시용 컷 (배치 편집기와 같은 asset) */
export const CROP_ICONS: Readonly<Partial<Record<string, string>>> = {
  potato: "/crops/potato.png",
  lettuce: "/crops/lettuce.png",
  "kidney-bean": "/crops/kidney-bean.png",
  "young-radish": "/crops/young-radish.png",
  spinach: "/crops/spinach.png",
  "green-onion": "/crops/green-onion.png",
  carrot: "/crops/carrot.png",
  tomato: "/crops/tomato.png",
  cucumber: "/crops/cucumber.png",
  pepper: "/crops/pepper.png",
  "cherry-tomato": "/crops/cherry-tomato.png",
  basil: "/crops/basil.png",
  strawberry: "/crops/strawberry.png",
  "gift-bouquet": "/crops/gift-bouquet.png",
  "moth-orchid": "/crops/moth-orchid.png",
  "african-violet": "/crops/african-violet.png",
};

export function cropPhoto(cropId: string): string | undefined {
  return CROP_PHOTOS[cropId];
}

export function cropIcon(cropId: string): string | undefined {
  return CROP_ICONS[cropId];
}
