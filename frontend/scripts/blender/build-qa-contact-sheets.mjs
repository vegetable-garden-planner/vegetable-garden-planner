import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const qaRoot = path.resolve("public", "models", "garden", "qa");
const assets = [
  "planter",
  "lettuce",
  "cherry-tomato",
  "basil",
  "chili",
  "spinach",
  "strawberry",
];
const angles = ["front", "back", "left", "right"];

for (const directory of await readdir(qaRoot, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const stageDirectory = path.join(qaRoot, directory.name);
  const files = await readdir(stageDirectory);
  const inputs = [];

  for (const [row, asset] of assets.entries()) {
    for (const [column, angle] of angles.entries()) {
      const file = files.find(
        (candidate) => candidate.startsWith(`${asset}-`) && candidate.endsWith(`-${angle}.png`),
      );
      if (!file) continue;
      inputs.push({
        input: path.join(stageDirectory, file),
        left: column * 512,
        top: row * 512,
      });
    }
  }

  if (inputs.length === assets.length * angles.length) {
    await sharp({
      create: {
        width: angles.length * 512,
        height: assets.length * 512,
        channels: 4,
        background: { r: 14, g: 20, b: 17, alpha: 255 },
      },
    })
      .composite(inputs)
      .png()
      .toFile(path.join(stageDirectory, "contact-sheet.png"));
  }
}

const animationDirectory = path.join(qaRoot, "06_rig-animation-frames");
try {
  const files = await readdir(animationDirectory);
  const frames = [1, 31, 61, 91, 121];
  const crops = assets.slice(1);
  const inputs = [];
  for (const [row, crop] of crops.entries()) {
    for (const [column, frame] of frames.entries()) {
      const filename = `${crop}-frame-${String(frame).padStart(3, "0")}.png`;
      if (!files.includes(filename)) continue;
      inputs.push({ input: path.join(animationDirectory, filename), left: column * 512, top: row * 512 });
    }
  }
  if (inputs.length === crops.length * frames.length) {
    await sharp({
      create: {
        width: frames.length * 512,
        height: crops.length * 512,
        channels: 4,
        background: { r: 14, g: 20, b: 17, alpha: 255 },
      },
    }).composite(inputs).png().toFile(path.join(animationDirectory, "contact-sheet.png"));
  }
} catch {
  // Animation frames are generated after the static stage sheets.
}
