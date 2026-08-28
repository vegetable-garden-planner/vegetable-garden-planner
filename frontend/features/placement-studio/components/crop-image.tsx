"use client";

import { useState } from "react";
import { cropImageSources } from "@/features/placement-studio/data/crop-images";

/**
 * 작물 그림
 *
 * 실제로 파일이 있는 작물만 그림을 쓴다.
 * 파일이 없으면 다른 작물 사진을 빌려 오지 않고 이름 첫 글자 배지로 대신한다.
 */
export function CropImage({
  cropId,
  name,
  imageClass,
  letterClass,
}: {
  cropId: string;
  name: string;
  imageClass: string;
  letterClass: string;
}) {
  const sources = cropImageSources(cropId);
  const [tried, setTried] = useState({ cropId, index: 0 });
  if (tried.cropId !== cropId) setTried({ cropId, index: 0 });

  const index = tried.cropId === cropId ? tried.index : 0;
  const source = sources[index];

  if (!source) {
    return <span aria-hidden="true" className={letterClass}>{name.slice(0, 1)}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 그림이 없을 때 이름 배지로 넘어가야 해서 onError 가 필요하다
    <img
      alt=""
      className={imageClass}
      /* 브라우저 기본 이미지 끌기가 켜져 있으면 작물 이동용 pointer 이벤트가 끊긴다 */
      draggable={false}
      onError={() => setTried({ cropId, index: index + 1 })}
      src={source}
    />
  );
}
