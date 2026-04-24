/**
 * Подчистить уже залитые аккаунты: убрать в логине (и в локальной части почты) шаблон «_t» + цифры
 * (артефакт старого seed-bulk-recipients). Пользователей не удаляем — только UPDATE.
 *
 * Смотреть кого заденет:
 *   DRY_RUN=1 npx tsx scripts/fix-bulk-seed-login-email.ts
 *
 * Применить:
 *   CONFIRM_FIX_BULK_SEED_LOGINS=YES npx tsx scripts/fix-bulk-seed-login-email.ts
 *
 * Карта (полный набор для ЛК): waiter_code, new_login, password, user_id, old_login, old_email, new_email.
 * Пароль подставляется из файла сида по old_login; код официанта — первый TipLink.slug в БД.
 *   SEED_FIX_MAP_FILE=./fix-login-map.tsv \\
 *   SEED_FIX_CREDENTIALS_FILE=./seed-bulk-recipients-credentials.txt \\
 *   CONFIRM_FIX_BULK_SEED_LOGINS=YES npx tsx scripts/fix-bulk-seed-login-email.ts
 *
 * Критерий: role = RECIPIENT и login ~* '_t[0-9]' (PostgreSQL).
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Убираем подстроку _t / _T + одна или более цифр (жадно до следующего не-цифры не нужно — только цифры после _t). */
function stripTArtifact(s: string): string {
  let t = s.replace(/_t[0-9]+/gi, "");
  t = t.replace(/__+/g, "_").replace(/^_+|_+$/g, "");
  return t;
}

function randomSuffix(rng: () => number): string {
  return String(Math.floor(rng() * 900_000 + 100_000));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function uniqueLoginCandidate(base: string, excludeUserId: string, rng: () => number): Promise<string> {
  let candidate = base.slice(0, 50);
  if (candidate.length < 3) candidate = `u${randomSuffix(rng)}`.slice(0, 50);
  let guard = 0;
  while (guard < 200) {
    guard += 1;
    const clash = await prisma.user.findFirst({
      where: { login: candidate, id: { not: excludeUserId } },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base.slice(0, 40)}_${randomSuffix(rng)}`.slice(0, 50);
  }
  throw new Error(`Не удалось подобрать уникальный логин для ${excludeUserId}`);
}

function loadSeedPasswordByLogin(filePath: string): Map<string, string> {
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

async function uniqueEmailCandidate(
  baseLocal: string,
  domain: string,
  excludeUserId: string,
  rng: () => number,
): Promise<string> {
  const dom = domain.trim().toLowerCase();
  let loc =
    baseLocal
      .replace(/[^a-zA-Z0-9._+-]/g, "")
      .slice(0, 55)
      .replace(/^\.+|\.+$/g, "") || `u${randomSuffix(rng)}`;
  for (let g = 0; g < 200; g++) {
    const email = `${loc}@${dom}`.toLowerCase();
    const clash = await prisma.user.findFirst({
      where: { email, id: { not: excludeUserId } },
      select: { id: true },
    });
    if (!clash) return email;
    loc = `${stripTArtifact(baseLocal).slice(0, 28)}${randomSuffix(rng)}${String(Math.floor(rng() * 99))}`.slice(0, 60);
  }
  throw new Error(`Не удалось подобрать уникальный email для ${excludeUserId}`);
}

async function main() {
  const dry = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  if (!dry && process.env.CONFIRM_FIX_BULK_SEED_LOGINS !== "YES") {
    console.error("Задайте CONFIRM_FIX_BULK_SEED_LOGINS=YES или DRY_RUN=1");
    process.exit(1);
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; login: string; email: string | null }>>`
    SELECT "id", "login", "email"
    FROM "users"
    WHERE "role" = 'RECIPIENT'
      AND "login" ~* '_t[0-9]'
  `;

  console.log(`К обработке: ${rows.length} строк`);
  const rng = mulberry32(0xfeed1234);

  const mapPath = process.env.SEED_FIX_MAP_FILE?.trim();
  const credPath =
    process.env.SEED_FIX_CREDENTIALS_FILE?.trim() ||
    process.env.SEED_BULK_CREDENTIALS_FILE?.trim() ||
    process.env.SEED_EXPORT_CREDENTIALS_FILE?.trim();
  const credByLogin =
    credPath && fs.existsSync(credPath) ? loadSeedPasswordByLogin(credPath) : null;
  if (mapPath && (!credByLogin || credByLogin.size === 0)) {
    console.warn(
      "SEED_FIX_MAP_FILE задан, но нет SEED_FIX_CREDENTIALS_FILE (или пустой файл) — в карте колонка password будет пустой. Укажи тот же txt, что при bulk-seed.",
    );
  }

  const userIds = rows.map((r) => r.id);
  const tipRows =
    userIds.length > 0
      ? await prisma.tipLink.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, slug: true, createdAt: true },
          orderBy: [{ userId: "asc" }, { createdAt: "asc" }],
        })
      : [];
  const waiterCodeByUserId = new Map<string, string>();
  for (const tl of tipRows) {
    if (!waiterCodeByUserId.has(tl.userId)) waiterCodeByUserId.set(tl.userId, tl.slug);
  }

  const mapLines: string[] = [];
  if (mapPath) {
    mapLines.push("waiter_code\tnew_login\tpassword\tuser_id\told_login\told_email\tnew_email");
  }

  for (const row of rows) {
    const oldLogin = row.login;
    const oldEmail = row.email?.trim() ?? null;
    let newLogin = stripTArtifact(oldLogin);
    newLogin = await uniqueLoginCandidate(newLogin, row.id, rng);

    let newEmail: string | null = null;
    if (oldEmail?.includes("@")) {
      const [local, dom] = oldEmail.split("@", 2);
      const newLocal = stripTArtifact((local ?? "").trim());
      const baseLocal = newLocal.length >= 1 ? newLocal : newLogin;
      newEmail = await uniqueEmailCandidate(baseLocal, (dom ?? "mail.ru").trim(), row.id, rng);
    }

    console.log(`${dry ? "[dry] " : ""}${oldLogin} → ${newLogin}${oldEmail && newEmail ? `   |   ${oldEmail} → ${newEmail}` : ""}`);

    if (mapPath) {
      const waiterCode = waiterCodeByUserId.get(row.id) ?? "";
      const password = credByLogin?.get(oldLogin) ?? "";
      mapLines.push(
        `${waiterCode}\t${newLogin}\t${password}\t${row.id}\t${oldLogin}\t${oldEmail ?? ""}\t${newEmail ?? ""}`,
      );
    }

    if (!dry) {
      await prisma.$transaction(async (tx) => {
        if (oldEmail && newEmail) {
          await tx.registrationRequest.updateMany({
            where: { email: { equals: oldEmail, mode: "insensitive" } },
            data: { email: newEmail },
          });
        }
        await tx.user.update({
          where: { id: row.id },
          data: {
            login: newLogin,
            ...(newEmail ? { email: newEmail } : {}),
          },
        });
      });
    }
  }

  if (mapPath && mapLines.length > 1) {
    fs.writeFileSync(mapPath, `${mapLines.join("\n")}\n`, "utf8");
    console.log(`Карта old→new: ${path.resolve(mapPath)} (${mapLines.length - 1} строк)`);
  }

  if (dry) console.log("DRY_RUN: изменений в БД не было.");
  else console.log(`Готово: обновлено ${rows.length} пользователей.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
