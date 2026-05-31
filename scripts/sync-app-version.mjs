/**
 * Синхронизирует public/app-version.json с versionCode/versionName из android/app/build.gradle.kts.
 * Вызывается из npm run copy-apk после копирования APK.
 */
import fs from "fs";
import path from "path";

const gradlePath = "android/app/build.gradle.kts";
const outPath = "public/app-version.json";
const apkPath = "public/freetips.apk";

const gradle = fs.readFileSync(gradlePath, "utf8");
const versionCode = Number(gradle.match(/versionCode\s*=\s*(\d+)/)?.[1] ?? 1);
const versionName = gradle.match(/versionName\s*=\s*"([^"]+)"/)?.[1] ?? "1.0.0";

let existing = {};
try {
  existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
} catch {
  /* first run */
}

const payload = {
  versionCode,
  versionName,
  apkUrl: existing.apkUrl ?? "/freetips.apk",
  minVersionCode: existing.minVersionCode ?? 1,
  releaseNotes: existing.releaseNotes ?? "",
};

fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

if (!fs.existsSync(apkPath)) {
  console.warn(`⚠ ${apkPath} не найден — выполните сборку android и npm run copy-apk`);
} else {
  const stat = fs.statSync(apkPath);
  console.log(`freetips.apk → ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
}

console.log(`app-version.json → ${versionName} (${versionCode})`);
