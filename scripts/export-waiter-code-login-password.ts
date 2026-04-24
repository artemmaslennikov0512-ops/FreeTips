/**
 * Выгрузка RECIPIENT: код официанта (TipLink.slug), логин, пароль.
 * Пароль только из файла bulk-seed (в БД — хэш).
 *
 *   SEED_EXPORT_CREDENTIALS_FILE=./seed-bulk-recipients-credentials.txt \\
 *   SEED_EXPORT_OUT=./waiters.tsv \\
 *   npx tsx scripts/export-waiter-code-login-password.ts
 *
 * Опционально: SEED_EXPORT_MAP_FILE=./fix-login-map.tsv
 *              SEED_EXPORT_CREATED_AFTER=2026-03-01
 */

import "dotenv/config";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function loadCredentialsByLogin(filePath: string): Map<string, string> {
  const raw = fs.readFileSync(filePath, "utf8");
  const map = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = t.split("\t");
    if (parts.length < 3) continue;
    const login = parts[0]!.trim();
    const password = parts[2]!.trim();
    if (login) map.set(login, password);
  }
  return map;
}

function loadNewLoginToOldLogin(mapPath: string): Map<string, string> {
  const raw = fs.readFileSync(mapPath, "utf8");
  const m = new Map<string, string>();
  let first = true;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (first) {
      first = false;
      if (t.toLowerCase().includes("old_login") && t.toLowerCase().includes("new_login")) continue;
    }
    const parts = t.split("\t");
    if (parts.length < 3) continue;
    const oldLogin = parts[1]!.trim();
    const newLogin = parts[2]!.trim();
    if (newLogin && oldLogin) m.set(newLogin, oldLogin);
  }
  return m;
}

function resolvePassword(
  login: string,
  creds: Map<string, string>,
  newToOld: Map<string, string> | null,
): string {
  const direct = creds.get(login);
  if (direct !== undefined) return direct;
  const old = newToOld?.get(login);
  if (old !== undefined) {
    const p = creds.get(old);
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

    if (!credPath || !fs.existsSync(credPath)) {
      throw new Error("Укажи SEED_EXPORT_CREDENTIALS_FILE — txt сида (login\\temail\\tpassword\\t…).");
    }

    const creds = loadCredentialsByLogin(credPath);
    const newToOld = mapPath && fs.existsSync(mapPath) ? loadNewLoginToOldLogin(mapPath) : null;
    if (mapPath && !newToOld?.size) {
      throw new Error("SEED_EXPORT_MAP_FILE задан, но не разобран (нужны old_login, new_login).");
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
      const password = resolvePassword(r.login, creds, newToOld);
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
    if (missingPassword) console.error(`Строк без пароля (проверь логины/карту): ${missingPassword}`);
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
