/**
 * GET /api/app/version — публичная информация о последней версии Android APK.
 * Источник: public/app-version.json (обновляется npm run copy-apk), env переопределяет поля.
 */

import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AppVersionFile = {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  minVersionCode?: number;
  releaseNotes?: string;
};

const DEFAULT: AppVersionFile = {
  versionCode: 1,
  versionName: "1.0.0",
  apkUrl: "/freetips.apk",
  minVersionCode: 1,
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function loadFromFile(): AppVersionFile {
  const filePath = path.join(process.cwd(), "public", "app-version.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<AppVersionFile>;
    return {
      versionCode: parsePositiveInt(String(parsed.versionCode ?? ""), DEFAULT.versionCode),
      versionName: typeof parsed.versionName === "string" && parsed.versionName.trim()
        ? parsed.versionName.trim()
        : DEFAULT.versionName,
      apkUrl: typeof parsed.apkUrl === "string" && parsed.apkUrl.trim()
        ? parsed.apkUrl.trim()
        : DEFAULT.apkUrl,
      minVersionCode: parsed.minVersionCode != null
        ? parsePositiveInt(String(parsed.minVersionCode), DEFAULT.minVersionCode ?? 1)
        : DEFAULT.minVersionCode,
      releaseNotes: typeof parsed.releaseNotes === "string" ? parsed.releaseNotes.trim() : undefined,
    };
  } catch {
    return { ...DEFAULT };
  }
}

function resolveApkUrl(apkUrl: string, request: NextRequest): string {
  if (apkUrl.startsWith("http://") || apkUrl.startsWith("https://")) return apkUrl;
  const base = getBaseUrlFromRequest(request);
  if (!base) {
    const origin = request.nextUrl.origin;
    return `${origin}${apkUrl.startsWith("/") ? apkUrl : `/${apkUrl}`}`;
  }
  return `${base}${apkUrl.startsWith("/") ? apkUrl : `/${apkUrl}`}`;
}

export async function GET(request: NextRequest) {
  const file = loadFromFile();

  const versionCode = process.env.APP_APK_VERSION_CODE?.trim()
    ? parsePositiveInt(process.env.APP_APK_VERSION_CODE, file.versionCode)
    : file.versionCode;

  const versionName = process.env.APP_APK_VERSION_NAME?.trim() || file.versionName;

  const apkPath = process.env.APP_APK_URL?.trim() || file.apkUrl;

  const minVersionCode = process.env.APP_APK_MIN_VERSION_CODE?.trim()
    ? parsePositiveInt(process.env.APP_APK_MIN_VERSION_CODE, file.minVersionCode ?? 1)
    : file.minVersionCode ?? 1;

  const releaseNotes = process.env.APP_APK_RELEASE_NOTES?.trim() || file.releaseNotes;

  return NextResponse.json({
    versionCode,
    versionName,
    apkUrl: resolveApkUrl(apkPath, request),
    minVersionCode,
    ...(releaseNotes ? { releaseNotes } : {}),
  });
}
