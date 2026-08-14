import Image from "next/image";
import type { CropCategory, CropReference } from "@/features/crop-catalog/domain/crop-reference";

const CROP_IMAGES: Partial<Record<string, string>> = {
  lettuce: "/figma/image3.png",
  spinach: "/figma/image5.png",
  tomato: "/figma/image7.png",
};

const CATEGORY_CLASSES: Record<CropCategory, string> = {
  leaf: "crop-visual-leaf",
  fruit: "crop-visual-fruit",
  root: "crop-visual-root",
  legume: "crop-visual-legume",
  tuber: "crop-visual-tuber",
  flower: "crop-visual-flower",
};

export function CropVisual({ crop, compact = false }: { crop: CropReference; compact?: boolean }) {
  const image = CROP_IMAGES[crop.id];
  return (
    <span className={`crop-visual ${compact ? "crop-visual-compact" : ""} ${CATEGORY_CLASSES[crop.category]}`} aria-hidden="true">
      {image
        ? <Image alt="" fill sizes={compact ? "40px" : "64px"} src={image} />
        : <span>{crop.name.slice(0, 1)}</span>}
    </span>
  );
}
