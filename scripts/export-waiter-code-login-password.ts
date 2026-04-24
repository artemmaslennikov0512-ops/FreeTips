/**
 * Выгрузка RECIPIENT: код официанта (TipLink.slug), логин, пароль.
 * Пароль: из файла сида и/или из карты fix (колонки new_login + password), если карту собрали с SEED_FIX_CREDENTIALS_FILE.
 *
 *   SEED_EXPORT_CREDENTIALS_FILE=./seed-bulk-recipients-credentials.txt \\
 *   SEED_EXPORT_OUT=./waiters.tsv \\
 *   npx tsx scripts/export-waiter-code-login-password.ts
 *
 * Только карта с паролями (без сид-файла):
 *   SEED_EXPORT_MAP_FILE=./fix-login-map.tsv SEED_EXPORT_OUT=./waiters.tsv npx tsx ...
 *
 * Опционально: SEED_EXPORT_MAP_FILE, SEED_EXPORT_CREATED_AFTER=2026-03-01
 */

import "dotenv/config";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Как в fix-bulk-seed-login-email: убрать _t + цифры (сид-логин → часто такой же логин в БД после правки). */
function stripTArtifact(s: string): string {
  let t = s.replace(/_t[0-9]+/gi, "");
  t = t.replace(/__+/g, "_").replace(/^_+|_+$/g, "");
  return t;
}

type SeedCreds = {
  /** как в файле */
  byLoginExact: Map<string, string>;
  byLoginLower: Map<string, string>;
  /** email из 2-й колонки сида → пароль (если логин в БД уже другой, а почта та же) */
  byEmailLower: Map<string, string>;
};

function splitSeedLine(line: string): string[] {
  const t = line.trim();
  if (!t) return [];
  if (t.includes("\t")) return t.split("\t").map((s) => s.trim());
  if (t.includes(",")) return t.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
  return [];
}

function loadSeedCreds(filePath: string): SeedCreds {
  let raw = fs.readFileSync(filePath, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const byLoginExact = new Map<string, string>();
  const byLoginLower = new Map<string, string>();
  const byEmailLower = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = splitSeedLine(t);
    if (parts.length < 3) continue;
    const login = parts[0]!.trim();
    const email = (parts[1] ?? "").trim();
    const password = parts[2]!.trim();
    if (!password) continue;
    if (login) {
      byLoginExact.set(login, password);
      byLoginLower.set(login.toLowerCase(), password);
    }
    if (email.includes("@")) byEmailLower.set(email.toLowerCase(), password);
  }
  return { byLoginExact, byLoginLower, byEmailLower };
}

function pickSeedPassword(login: string, email: string | null, creds: SeedCreds): string | undefined {
  const a = creds.byLoginExact.get(login) ?? creds.byLoginLower.get(login.toLowerCase());
  if (a !== undefined) return a;
  if (email?.includes("@")) {
    const b = creds.byEmailLower.get(email.trim().toLowerCase());
    if (b !== undefined) return b;
  }
  /** Логин в БД = stripT(логин в сиде), а в файле ещё старый вариант с _t… — ищем единственное совпадение. */
  const ldb = login.toLowerCase();
  let fallbackPwd: string | undefined;
  let n = 0;
  for (const seedLogin of creds.byLoginExact.keys()) {
    if (stripTArtifact(seedLogin).toLowerCase() === ldb) {
      fallbackPwd = creds.byLoginExact.get(seedLogin);
      n += 1;
    }
  }
  if (n === 1 && fallbackPwd !== undefined) return fallbackPwd;
  return undefined;
}

function splitMapLine(line: string): string[] {
  const t = line.trim();
  if (t.includes("\t")) return t.split("\t").map((c) => c.trim());
  if (/[,;]/.test(t)) return t.split(/[,;]/).map((c) => c.trim());
  return [t];
}

/** Карта из fix-login-map.tsv: new→old для сид-файла; опционально password по new_login. */
function loadLoginMapFile(mapPath: string): { newToOld: Map<string, string>; passwordByNewLogin: Map<string, string> } {
  let raw = fs.readFileSync(mapPath, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const newToOld = new Map<string, string>();
  const passwordByNewLogin = new Map<string, string>();
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  let oldIdx = 1;
  let newIdx = 2;
  let pwdIdx = -1;
  let startRow = 0;

  if (lines.length > 0) {
    const h = splitMapLine(lines[0]!);
    const lower = h.map((c) => c.toLowerCase().replace(/\s+/g, "_"));
    const oi = lower.findIndex((c) => c === "old_login");
    const ni = lower.findIndex((c) => c === "new_login");
    const pi = lower.findIndex((c) => c === "password");
    if (oi >= 0 && ni >= 0) {
      oldIdx = oi;
      newIdx = ni;
      pwdIdx = pi;
      startRow = 1;
    }
  }

  for (let i = startRow; i < lines.length; i++) {
    const t = lines[i]!;
    if (t.startsWith("#")) continue;
    const parts = splitMapLine(t);
    if (parts.length <= Math.max(oldIdx, newIdx)) continue;
    const oldLogin = (parts[oldIdx] ?? "").trim();
    const newLogin = (parts[newIdx] ?? "").trim();
    if (newLogin && oldLogin) newToOld.set(newLogin, oldLogin);
    if (pwdIdx >= 0 && parts.length > pwdIdx) {
      const pwd = (parts[pwdIdx] ?? "").trim();
      if (pwd && newLogin) passwordByNewLogin.set(newLogin, pwd);
    }
  }

  return { newToOld, passwordByNewLogin };
}

function resolvePassword(
  login: string,
  email: string | null,
  creds: SeedCreds,
  newToOld: Map<string, string> | null,
  passwordByNewLogin: Map<string, string> | null,
): string {
  const fromMap = passwordByNewLogin?.get(login);
  if (fromMap) return fromMap;
  const direct = pickSeedPassword(login, email, creds);
  if (direct !== undefined) return direct;
  const old = newToOld?.get(login);
  if (old !== undefined) {
    const p = pickSeedPassword(old, null, creds);
    if (p !== undefined) return p;
  }
  return "";
}

export async function runExportWaiterCredentials(): Promise<void> {
  try {
    const outPath = process.env.SEED_EXPORT_OUT?.trim();
    const credPath = process.env.SEED_EXPORT_CREDENTIALS_FILE?.trim();
    const mapPath = process.env.SEED_EXPORT_MAP_FILE?.trim();
    const afterRaw = process.env.SEED_EXPORT_CREATED_AFTER?.trim();

    console.error("[export-waiter-code-login-password] колонки: waiter_code, login, password");

    let newToOld: Map<string, string> | null = null;
    let passwordByNewLogin: Map<string, string> | null = null;
    if (mapPath) {
      if (!fs.existsSync(mapPath)) {
        console.error(`SEED_EXPORT_MAP_FILE: файл не найден (${mapPath}), карта не используется.`);
      } else {
        const parsed = loadLoginMapFile(mapPath);
        newToOld = parsed.newToOld.size ? parsed.newToOld : null;
        passwordByNewLogin = parsed.passwordByNewLogin.size ? parsed.passwordByNewLogin : null;
        if (!parsed.newToOld.size) {
          console.error(
            "SEED_EXPORT_MAP_FILE: нет пар old_login/new_login (проверь заголовок и табы). Пароль из карты — только если есть колонка password и совпадение new_login.",
          );
        }
      }
    }

    const creds: SeedCreds =
      credPath && fs.existsSync(credPath) ? loadSeedCreds(credPath) : { byLoginExact: new Map(), byLoginLower: new Map(), byEmailLower: new Map() };

    const credRows = creds.byLoginExact.size;
    if (credRows > 0) console.error(`Из сида загружено паролей по логину: ${credRows}`);

    if (credRows === 0 && (!passwordByNewLogin || passwordByNewLogin.size === 0)) {
      throw new Error(
        "В файле сида не найдено ни одной строки login+password (проверь табы между колонками). Либо укажи карту с password. Либо SEED_EXPORT_MAP_FILE с old_login/new_login.",
      );
    }

    const where: Prisma.UserWhereInput = { role: "RECIPIENT" };
    if (afterRaw) {
      const d = new Date(afterRaw);
      if (Number.isNaN(d.getTime())) {
        throw new Error("Некорректный SEED_EXPORT_CREATED_AFTER");
      }
      where.createdAt = { gte: d };
    }

    const rows = await prisma.user.findMany({
      where,
      select: {
        login: true,
        email: true,
        tipLinks: { select: { slug: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
      take: 50_000,
    });

    let missingSlug = 0;
    let missingPassword = 0;
    const lines = ["waiter_code\tlogin\tpassword"];

    for (const r of rows) {
      const slug = r.tipLinks[0]?.slug ?? "";
      if (!slug) {
        missingSlug += 1;
        continue;
      }
      const password = resolvePassword(r.login, r.email, creds, newToOld, passwordByNewLogin);
      if (!password) missingPassword += 1;
      lines.push(`${slug}\t${r.login}\t${password}`);
    }

    const body = `${lines.join("\n")}\n`;

    if (outPath) {
      fs.writeFileSync(outPath, body, "utf8");
      console.error(`Записано: ${path.resolve(outPath)} (${lines.length - 1} строк)`);
    } else {
      process.stdout.write(body);
    }

    if (missingSlug) console.error(`Пропущено без TipLink: ${missingSlug}`);
    if (missingPassword) {
      console.error(
        `Строк без пароля: ${missingPassword}. Часто логин в БД уже не совпадает с 1-й колонкой сида — тогда нужен SEED_EXPORT_MAP_FILE (old_login → new_login) или карта с колонкой password.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

const selfPath = path.resolve(fileURLToPath(import.meta.url));
const entryPath = path.resolve(process.argv[1] ?? "");
const isMain = entryPath === selfPath;

if (isMain) {
  runExportWaiterCredentials().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
