import Image from "next/image";
import { CROP_ICONS, CROP_PHOTOS } from "@/features/crop-catalog/data/crop-photos";
import type { CropCategory, CropReference } from "@/features/crop-catalog/domain/crop-reference";

/**
 * 큰 영역(도감 카드 / 상세 히어로)에 쓰는 실사 사진.
 * 이전 이름을 그대로 두어 이미 이걸 쓰던 화면이 함께 바뀐다.
 */
export const CROP_IMAGES = CROP_PHOTOS;

/** 작은 원형 자리에 쓰는 컷 그림 */
export { CROP_ICONS };

const CATEGORY_CLASSES: Record<CropCategory, string> = {
  leaf: "crop-visual-leaf",
  fruit: "crop-visual-fruit",
  root: "crop-visual-root",
  legume: "crop-visual-legume",
  tuber: "crop-visual-tuber",
  flower: "crop-visual-flower",
};

export function CropVisual({ crop, compact = false }: { crop: CropReference; compact?: boolean }) {
  const image = CROP_ICONS[crop.id];
  return (
    <span className={`crop-visual ${compact ? "crop-visual-compact" : ""} ${CATEGORY_CLASSES[crop.category]}`} aria-hidden="true">
      {image
        ? <Image alt="" fill sizes={compact ? "40px" : "64px"} src={image} />
        : <span>{crop.name.slice(0, 1)}</span>}
    </span>
  );
}
