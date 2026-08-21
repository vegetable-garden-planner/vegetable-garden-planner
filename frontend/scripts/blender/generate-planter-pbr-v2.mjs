import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const textureRoot = path.resolve("public", "models", "garden", "textures");

function hashNoise(x, y) {
  let value = Math.imul(x + 173, 374761393) ^ Math.imul(y + 719, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function satinNoise(x, y, width, height) {
  const coarse = hashNoise(Math.floor(x / 31), Math.floor(y / 31));
  const fine = hashNoise(x, y);
  const moldingFlow = Math.sin((x / width) * Math.PI * 18 + Math.sin((y / height) * Math.PI * 3) * 0.45);
  return (coarse - 0.5) * 0.46 + (fine - 0.5) * 0.18 + moldingFlow * 0.08;
}

async function writeTexture(file, width, height, pixel) {
  const buffer = Buffer.allocUnsafe(width * height * 4);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha = 255] = pixel(x, y, width, height);
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
  await writeTexture(path.join(directory, `T_Planter_BaseColor_${suffix}.png`), size, size, (x, y, width, height) => {
    const noise = satinNoise(x, y, width, height);
    return [10 + noise * 5.0, 55 + noise * 10.5, 38 + noise * 7.5, 255];
  });
  await writeTexture(path.join(directory, `T_Planter_Roughness_${suffix}.png`), size, size, (x, y, width, height) => {
    const noise = satinNoise(x + 911, y + 353, width, height);
    const value = 116 + noise * 28;
    return [value, value, value, 255];
  });
  await writeTexture(path.join(directory, `T_Planter_Metallic_${suffix}.png`), size, size, () => [0, 0, 0, 255]);
  await writeTexture(path.join(directory, `T_Planter_Normal_${suffix}.png`), size, size, (x, y) => {
    const left = hashNoise(x - 1, y);
    const right = hashNoise(x + 1, y);
    const down = hashNoise(x, y - 1);
    const up = hashNoise(x, y + 1);
    return [128 + (left - right) * 5.5, 128 + (down - up) * 5.5, 255, 255];
  });
  await writeTexture(path.join(directory, `T_Planter_AO_${suffix}.png`), size, size, (x, y, width, height) => {
    const noise = satinNoise(x + 271, y + 811, width, height);
    const value = 249 + noise * 3;
    return [value, value, value, 255];
  });
}
