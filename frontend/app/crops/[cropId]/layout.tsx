import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CROP_REFERENCES } from "@/features/crop-catalog/data/crop-references";
import { createCropPageMetadata } from "@/features/crop-catalog/domain/crop-page-metadata";

interface CropDetailMetadataProps {
  params: Promise<{ cropId: string }>;
}

export async function generateMetadata(
  { params }: CropDetailMetadataProps,
): Promise<Metadata> {
  const { cropId } = await params;
  const cropMetadata = createCropPageMetadata(cropId, CROP_REFERENCES);

  return {
    title: cropMetadata.title,
    description: cropMetadata.description,
    openGraph: {
      title: cropMetadata.title,
      description: cropMetadata.description,
      images: [{ url: "/opengraph-image.png", alt: "심어봄 재배 계획" }],
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: cropMetadata.title,
      description: cropMetadata.description,
      images: ["/opengraph-image.png"],
    },
  };
}

export default function CropDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
