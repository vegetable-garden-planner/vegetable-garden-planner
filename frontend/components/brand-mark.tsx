import Image from "next/image";
import logoColor from "@/public/brand/logo.png";
import logoWhite from "@/public/brand/logo-white.png";

interface BrandMarkProps {
  variant?: "color" | "white";
  size?: number;
}

export function BrandMark({ variant = "color", size = 28 }: BrandMarkProps) {
  return (
    <Image
      className="brand-mark-image"
      src={variant === "white" ? logoWhite : logoColor}
      alt=""
      width={size}
      height={size}
    />
  );
}
