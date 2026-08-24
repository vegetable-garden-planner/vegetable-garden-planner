// 일회용 스크립트: PWA 아이콘을 브랜드 로고에서 생성한다. 로고나 색이 바뀌면 다시 실행한다.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const logo = path.join(root, "public/brand/logo-white.png");
const brandGreen = "#079568";

async function makeIcon(outPath, canvasSize, logoRatio) {
  const logoSize = Math.round(canvasSize * logoRatio);
  const logoBuffer = await sharp(logo).resize(logoSize, logoSize, { fit: "inside" }).toBuffer();

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: brandGreen,
    },
  })
    .composite([{ input: logoBuffer, gravity: "center" }])
    .png()
    .toFile(outPath);

  console.log("wrote", outPath);
}

// "pwa-icons", not "icons": Apache reserves /icons/ as a server-wide alias
// for its own built-in directory-listing icons, which silently shadows
// anything an app puts there on shared hosting (no root to remove it).
mkdirSync(path.join(root, "public/pwa-icons"), { recursive: true });

await makeIcon(path.join(root, "public/pwa-icons/icon-192.png"), 192, 0.7);
await makeIcon(path.join(root, "public/pwa-icons/icon-512.png"), 512, 0.7);
await makeIcon(path.join(root, "public/pwa-icons/icon-maskable-512.png"), 512, 0.55);
await makeIcon(path.join(root, "app/apple-icon.png"), 180, 0.7);
