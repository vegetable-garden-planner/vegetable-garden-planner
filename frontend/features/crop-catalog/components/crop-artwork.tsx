import Image from "next/image";
import type { CropCategory, CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { CROP_IMAGES } from "@/features/crop-catalog/components/crop-visual";
import styles from "./crop-artwork.module.css";

const CATEGORY_CLASSES: Record<CropCategory, string> = {
  leaf: styles.leaf,
  fruit: styles.fruit,
  root: styles.root,
  legume: styles.legume,
  tuber: styles.tuber,
  flower: styles.flower,
};

export function CropArtwork({
  crop,
  priority = false,
  variant = "card",
}: {
  crop: CropReference;
  priority?: boolean;
  variant?: "card" | "hero";
}) {
  const image = CROP_IMAGES[crop.id];

  return (
    <div className={`${styles.artwork} ${styles[variant]} ${CATEGORY_CLASSES[crop.category]}`}>
      {image
        ? <Image alt={`${crop.name} 재배 모습`} fill priority={priority} sizes={variant === "hero" ? "(max-width: 720px) 100vw, 560px" : "(max-width: 720px) 100vw, 420px"} src={image} />
        : <span aria-hidden="true">{crop.name.slice(0, 1)}</span>}
      <div className={styles.shade} aria-hidden="true" />
      <p>{crop.name}</p>
    </div>
  );
}
