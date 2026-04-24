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
 * Карта для склейки с файлом паролей (старый логин = первый столбец сида):
 *   SEED_FIX_MAP_FILE=./fix-login-map.tsv CONFIRM_FIX_BULK_SEED_LOGINS=YES npx tsx scripts/fix-bulk-seed-login-email.ts
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
  const mapLines: string[] = [];
  if (mapPath) {
    mapLines.push("user_id\told_login\tnew_login\told_email\tnew_email");
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
      mapLines.push(`${row.id}\t${oldLogin}\t${newLogin}\t${oldEmail ?? ""}\t${newEmail ?? ""}`);
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
