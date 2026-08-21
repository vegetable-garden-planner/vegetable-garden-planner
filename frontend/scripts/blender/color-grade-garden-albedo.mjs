import { mkdtemp, rename } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("public", "models", "garden", "textures");
const crops = ["lettuce", "cherry-tomato", "basil", "chili", "spinach", "strawberry"];
const displayNames = {
  lettuce: "Lettuce",
  "cherry-tomato": "CherryTomato",
  basil: "Basil",
  chili: "Chili",
  spinach: "Spinach",
  strawberry: "Strawberry",
};

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "garden-albedo-"));

for (const crop of crops) {
  for (const [tier, suffix] of [["master", "4K"], ["runtime", "1K"]]) {
    const filename = `T_${displayNames[crop]}_BaseColor_${suffix}.png`;
    const source = path.join(root, tier, crop, filename);
    const temporary = path.join(temporaryDirectory, `${tier}-${filename}`);
    await sharp(source)
      .recomb([
        [0.55, 0.03, 0.00],
        [0.08, 0.82, 0.04],
        [0.00, 0.03, 0.48],
      ])
      .png()
      .toFile(temporary);
    await rename(temporary, source);
  }
}

