import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const thumbnailDirectory = path.resolve(
  "public",
  "models",
  "garden",
  "thumbnails",
);

const files = (await readdir(thumbnailDirectory)).filter((file) =>
  file.endsWith(".webp"),
);

await Promise.all(
  files.map(async (file) => {
    const filePath = path.join(thumbnailDirectory, file);
    const renderedCrop = await sharp(filePath)
      .ensureAlpha()
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(460, 270, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .toBuffer();

    const normalizedThumbnail = await sharp({
      create: {
        width: 512,
        height: 320,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: renderedCrop, gravity: "center" }])
      .webp({ quality: 88, alphaQuality: 100 })
      .toBuffer();

    await writeFile(filePath, normalizedThumbnail);
  }),
);
