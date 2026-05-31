/**
 * Проверка: build.gradle.kts, app-version.json и freetips.apk согласованы.
 */
import fs from "fs";

const gradlePath = "android/app/build.gradle.kts";
const jsonPath = "public/app-version.json";
const apkPath = "public/freetips.apk";

const gradle = fs.readFileSync(gradlePath, "utf8");
const gradleCode = Number(gradle.match(/versionCode\s*=\s*(\d+)/)?.[1]);
const gradleName = gradle.match(/versionName\s*=\s*"([^"]+)"/)?.[1];

const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const errors = [];

if (!fs.existsSync(apkPath)) {
  errors.push(`${apkPath} отсутствует — npm run copy-apk`);
}

if (json.versionCode !== gradleCode) {
  errors.push(`versionCode: app-version.json=${json.versionCode}, build.gradle.kts=${gradleCode}`);
}

if (json.versionName !== gradleName) {
  errors.push(`versionName: app-version.json=${json.versionName}, build.gradle.kts=${gradleName}`);
}

if (json.apkUrl !== "/freetips.apk") {
  errors.push(`apkUrl должен быть /freetips.apk, сейчас ${json.apkUrl}`);
}

if (errors.length) {
  console.error("Рассинхрон APK:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

const apkMb = (fs.statSync(apkPath).size / 1024 / 1024).toFixed(2);
console.log(`OK: ${json.versionName} (${json.versionCode}), freetips.apk ${apkMb} MB`);
