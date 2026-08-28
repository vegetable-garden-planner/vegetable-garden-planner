/**
 * 배치 편집기에서 쓰는 작물 그림
 *
 * 규칙
 *  - 실제로 파일이 있는 작물만 그림을 쓴다.
 *  - 그림이 없으면 다른 작물 사진을 빌려 오지 않고 이름 배지로 대신한다.
 *  - 파일이 아직 없으면 <img> 의 onError 로 조용히 이름 배지로 넘어간다.
 *    (없는 그림 때문에 화면이 깨지지 않는다)
 *
 * public/crops/<작물 id>.png 로 파일을 넣으면 그때부터 그대로 보인다.
 * 작물 id 는 실제 API(/api/v1/crops)의 id 와 같다.
 */

const STUDIO_CROP_IMAGES: Readonly<Record<string, string>> = {
  potato: "/crops/potato.png",
  lettuce: "/crops/lettuce.png",
  "kidney-bean": "/crops/kidney-bean.png",
  "young-radish": "/crops/young-radish.png",
  spinach: "/crops/spinach.png",
  "green-onion": "/crops/green-onion.png",
  carrot: "/crops/carrot.png",
  tomato: "/crops/tomato.png",
  "cherry-tomato": "/crops/cherry-tomato.png",
  cucumber: "/crops/cucumber.png",
  pepper: "/crops/pepper.png",
  basil: "/crops/basil.png",
  strawberry: "/crops/strawberry.png",
  "gift-bouquet": "/crops/gift-bouquet.png",
  "moth-orchid": "/crops/moth-orchid.png",
  "african-violet": "/crops/african-violet.png",
};

/** 프로젝트에 이미 있는 실제 asset. 위 파일이 없을 때 대신 쓴다. */
const EXISTING_CROP_IMAGES: Readonly<Record<string, string>> = {
  tomato: "/figma/image7.webp",
  spinach: "/figma/crop-spinach-v1.png",
  pepper: "/figma/crop-chili-v1.png",
};

export function cropImageSources(cropId: string): string[] {
  const sources: string[] = [];
  const studio = STUDIO_CROP_IMAGES[cropId];
  if (studio) sources.push(studio);
  const existing = EXISTING_CROP_IMAGES[cropId];
  if (existing) sources.push(existing);
  return sources;
}
