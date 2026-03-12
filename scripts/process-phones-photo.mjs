/**
 * Обработка фото раздела с телефонами: контраст, резкость, насыщенность.
 * Запуск: node scripts/process-phones-photo.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsCursor = "C:\\Users\\masle\\.cursor\\projects\\c-Users-masle-Desktop\\assets";
const assetsProd = join(__dirname, "..", "assets");
const assetsDir = existsSync(assetsCursor) ? assetsCursor : assetsProd;
const srcPath = join(assetsDir, "freetips-phones-section.png");

if (!existsSync(srcPath)) {
  console.error("Файл не найден:", srcPath);
  process.exit(1);
}

const sharp = (await import("sharp")).default;
const buffer = readFileSync(srcPath);

const processed = await sharp(buffer)
  .modulate({ brightness: 1.03, saturation: 1.08 })
  .linear(1.05, -(1 - 1.05) * 128) // контраст ~1.05
  .sharpen({ sigma: 0.6, m1: 1, m2: 0.5 })
  .png({ quality: 95 })
  .toBuffer();

writeFileSync(srcPath, processed);
console.log("Готово:", srcPath);
