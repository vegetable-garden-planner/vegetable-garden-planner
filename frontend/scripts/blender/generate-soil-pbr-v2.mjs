import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const textureRoot = path.resolve("public", "models", "garden", "textures");

function hashNoise(x, y) {
  let value = Math.imul(x + 419, 374761393) ^ Math.imul(y + 977, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function loamNoise(x, y) {
  const coarse = hashNoise(Math.floor(x / 43), Math.floor(y / 43));
  const medium = hashNoise(Math.floor(x / 9), Math.floor(y / 9));
  const fine = hashNoise(x, y);
  return (coarse - 0.5) * 0.55 + (medium - 0.5) * 0.32 + (fine - 0.5) * 0.13;
}

async function writeTexture(file, width, height, pixel) {
  const buffer = Buffer.allocUnsafe(width * height * 4);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha = 255] = pixel(x, y);
      buffer[offset] = Math.max(0, Math.min(255, Math.round(red)));
      buffer[offset + 1] = Math.max(0, Math.min(255, Math.round(green)));
      buffer[offset + 2] = Math.max(0, Math.min(255, Math.round(blue)));
      buffer[offset + 3] = alpha;
      offset += 4;
    }
  }
  await sharp(buffer, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
}

for (const [tier, size, suffix] of [["master", 4096, "4K-v2"], ["runtime", 1024, "1K-v2"]]) {
  const directory = path.join(textureRoot, tier, "planter");
  await mkdir(directory, { recursive: true });
  await writeTexture(path.join(directory, `T_PlanterSoil_BaseColor_${suffix}.png`), size, size, (x, y) => {
    const noise = loamNoise(x, y);
    return [34 + noise * 20, 20 + noise * 11, 10 + noise * 7, 255];
  });
  await writeTexture(path.join(directory, `T_PlanterSoil_Roughness_${suffix}.png`), size, size, (x, y) => {
    const value = 224 + loamNoise(x + 613, y + 281) * 24;
    return [value, value, value, 255];
  });
  await writeTexture(path.join(directory, `T_PlanterSoil_Metallic_${suffix}.png`), size, size, () => [0, 0, 0, 255]);
  await writeTexture(path.join(directory, `T_PlanterSoil_Normal_${suffix}.png`), size, size, (x, y) => {
    const left = loamNoise(x - 1, y);
    const right = loamNoise(x + 1, y);
    const down = loamNoise(x, y - 1);
    const up = loamNoise(x, y + 1);
    return [128 + (left - right) * 18, 128 + (down - up) * 18, 255, 255];
  });
  await writeTexture(path.join(directory, `T_PlanterSoil_AO_${suffix}.png`), size, size, (x, y) => {
    const value = 238 + loamNoise(x + 197, y + 733) * 12;
    return [value, value, value, 255];
  });
}
