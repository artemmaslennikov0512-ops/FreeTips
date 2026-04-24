/**
 * Одноразовая заливка в БД получателей (RECIPIENT): заявка на подключение → одобрена → токен использован → пользователь.
 * Без заявок на верификацию.
 *
 * Требования:
 * - DATABASE_URL, JWT_SECRET (для шифрования кодового слова, как при регистрации)
 * - В БД есть хотя бы один SUPERADMIN (createdById / reviewedByUserId)
 *
 * Запуск (из корня репозитория):
 *   CONFIRM_SEED_BULK_RECIPIENTS=YES npx tsx scripts/seed-bulk-recipients.ts
 *
 * Опции env:
 *   SEED_BULK_COUNT=1500          — число аккаунтов
 *   SEED_BULK_CREDENTIALS_FILE=…  — путь к txt с логинами/паролями (по умолчанию ./seed-bulk-recipients-credentials.txt)
 *   SEED_BULK_RANDOM=12345        — seed PRNG для воспроизводимости (опционально)
 *
 * Даты регистрации: с 4 марта по «сегодня» по календарю Europe/Moscow; распределение — мало → рост → спад + лёгкий спад в выходные.
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import {
  generateRegistrationToken,
  getRegistrationTokenExpiresAt,
  hashRegistrationToken,
} from "../lib/auth/registration-token";
import { encryptRecoveryCodewordForAdminDisplay } from "../lib/auth/recovery-codeword-crypto";
import { getWaiterPaygineSdRef } from "../lib/payment/paygine-sd-ref";
import { allocateNextGlobalWaiterCode } from "../lib/waiter-qr-identifier";
import {
  buildNonWaiterJobTitles,
  buildSavingGoals,
  EMAIL_DOMAINS,
  ESTABLISHMENTS,
  FIRST_NAMES,
  LAST_NAMES,
  MOBILE_PREFIXES,
  randomNickname,
} from "./seed-bulk-recipients-data";

const prisma = new PrismaClient();

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const MSK_DAY_MS = 24 * 60 * 60 * 1000;

const PAYOUT_DAILY_LIMIT_COUNT = 5;
const PAYOUT_DAILY_LIMIT_KOP = BigInt("20000000");

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

function mskLocalToUtc(y: number, mon: number, d: number, hh: number, mm: number, ss: number): Date {
  return new Date(Date.UTC(y, mon - 1, d, hh, mm, ss) - MSK_OFFSET_MS);
}

function mskCalendarParts(dt: Date): { y: number; m: number; day: number } {
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dt);
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return { y, m, day: d };
}

function ymdKey(p: { y: number; m: number; day: number }): number {
  return p.y * 10_000 + p.m * 100 + p.day;
}

function mskWeekdayMidnight(dayStartUtc: Date): number {
  const { y, m, day } = mskCalendarParts(dayStartUtc);
  return mskLocalToUtc(y, m, day, 12, 0, 0).getUTCDay();
}

/** Старт окна: 4 марта (MSK) текущего года, если уже после этой даты; иначе — 4 марта прошлого года. Конец — now. */
function registrationWindowMsk(now: Date): { rangeStart: Date; rangeEnd: Date } {
  const { y: ey } = mskCalendarParts(now);
  const mar4ThisYear = mskLocalToUtc(ey, 3, 4, 0, 0, 0);
  const startY = now.getTime() < mar4ThisYear.getTime() ? ey - 1 : ey;
  const rangeStart = mskLocalToUtc(startY, 3, 4, 0, 0, 0);
  return { rangeStart, rangeEnd: now };
}

function enumerateMskDays(rangeStart: Date, rangeEnd: Date): Date[] {
  const out: Date[] = [];
  let cur = rangeStart;
  const endKey = ymdKey(mskCalendarParts(rangeEnd));
  while (ymdKey(mskCalendarParts(cur)) <= endKey) {
    out.push(new Date(cur));
    cur = new Date(cur.getTime() + MSK_DAY_MS);
  }
  return out;
}

function dayWeights(days: Date[], rng: () => number): number[] {
  const n = days.length;
  if (n === 0) return [];
  return days.map((dayStart, i) => {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    let w = t < 0.5 ? Math.sin((Math.PI / 2) * (t / 0.5)) : Math.sin((Math.PI / 2) * ((1 - t) / 0.5));
    const wd = mskWeekdayMidnight(dayStart);
    if (wd === 0 || wd === 6) w *= 0.78;
    w = Math.max(0.06, w) + rng() * 0.07;
    return w;
  });
}

function pickWeightedDayIndex(weights: number[], rng: () => number): number {
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function randomTimeOnMskDay(dayStartUtc: Date, rng: () => number, capUtc: Date): Date {
  const { y, m, day } = mskCalendarParts(dayStartUtc);
  const h = 8 + Math.floor(rng() * 16);
  const mm = Math.floor(rng() * 60);
  const ss = Math.floor(rng() * 60);
  let inst = mskLocalToUtc(y, m, day, h, mm, ss);
  if (inst.getTime() > capUtc.getTime()) {
    inst = new Date(capUtc.getTime() - Math.floor(rng() * 180_000));
  }
  return inst;
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function randomBirthDate(rng: () => number): string {
  const year = 1970 + Math.floor(rng() * 36);
  const month = 1 + Math.floor(rng() * 12);
  const day = 1 + Math.floor(rng() * 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function randomPhone10(rng: () => number): string {
  const pref = MOBILE_PREFIXES[Math.floor(rng() * MOBILE_PREFIXES.length)]!;
  let tail = "";
  for (let i = 0; i < 7; i++) tail += String(Math.floor(rng() * 10));
  return pref + tail;
}

function generatePassword(rng: () => number): string {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  let s = "";
  s += lower[Math.floor(rng() * lower.length)]!;
  s += upper[Math.floor(rng() * upper.length)]!;
  s += digits[Math.floor(rng() * digits.length)]!;
  const all = lower + upper + digits;
  while (s.length < 14) s += all[Math.floor(rng() * all.length)]!;
  const arr = s.split("");
  shuffleInPlace(arr, rng);
  return arr.join("");
}

function generateRecoveryCodeword(rng: () => number): string {
  const words = ["лес", "море", "ночь", "день", "зима", "лето", "дом", "сад", "путь", "мост", "ключ", "соль"];
  const w = words[Math.floor(rng() * words.length)]!;
  const n = 10 + Math.floor(rng() * 89);
  return `${w}${n}`;
}

function uniqueLoginFromNickname(nick: string, rng: () => number): string {
  const base = nick
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  const core = (base.length >= 3 ? base : `u_${Math.floor(rng() * 1e9)}`).replace(/^_+/, "u");
  const suffix = Math.floor(rng() * 1e6);
  let login = `${core}${suffix}`.slice(0, 50);
  if (login.length < 3) login = `u_${suffix}`;
  return login;
}

async function loadDefaultLimits(): Promise<Record<string, unknown>> {
  const row = await prisma.systemDefaultLimits.findUnique({ where: { id: "default" } });
  return {
    payoutDailyLimitCount: row?.payoutDailyLimitCount ?? PAYOUT_DAILY_LIMIT_COUNT,
    payoutDailyLimitKop: row?.payoutDailyLimitKop ?? PAYOUT_DAILY_LIMIT_KOP,
    payoutMonthlyLimitCount: row?.payoutMonthlyLimitCount ?? null,
    payoutMonthlyLimitKop: row?.payoutMonthlyLimitKop ?? null,
    incomingMonthlyLimitKop: row?.incomingMonthlyLimitKop ?? null,
    autoConfirmPayouts: row?.autoConfirmPayouts ?? false,
    autoConfirmPayoutThresholdKop: row?.autoConfirmPayoutThresholdKop ?? null,
  };
}

async function main() {
  if (process.env.CONFIRM_SEED_BULK_RECIPIENTS !== "YES") {
    console.error(
      "Отказ: задайте CONFIRM_SEED_BULK_RECIPIENTS=YES для запуска заливки в подключённую DATABASE_URL.",
    );
    process.exit(1);
  }

  const count = Math.min(5000, Math.max(1, Number(process.env.SEED_BULK_COUNT ?? "1500") || 1500));
  const rawSeed = process.env.SEED_BULK_RANDOM?.trim();
  const seedNum =
    rawSeed !== undefined && rawSeed !== "" && Number.isFinite(Number(rawSeed)) ? Number(rawSeed) : Date.now();
  const rng = mulberry32(seedNum >>> 0);

  const outFile =
    process.env.SEED_BULK_CREDENTIALS_FILE?.trim() ||
    path.join(process.cwd(), "seed-bulk-recipients-credentials.txt");

  const superAdmin = await prisma.user.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true, login: true },
  });
  if (!superAdmin) {
    console.error("В БД нет пользователя с ролью SUPERADMIN — нужен для createdById / reviewedByUserId.");
    process.exit(1);
  }

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "waiter_code_sequence" ("id", "lastAllocated")
      VALUES ('global', 0)
      ON CONFLICT ("id") DO NOTHING
    `);
  } catch (e) {
    console.error(
      "Таблица waiter_code_sequence недоступна (часто — не применены миграции). Выполните: npx prisma migrate deploy",
      e,
    );
    process.exit(1);
  }

  const limits = await loadDefaultLimits();
  const now = new Date();
  const { rangeStart, rangeEnd } = registrationWindowMsk(now);
  const dayStarts = enumerateMskDays(rangeStart, rangeEnd);
  if (dayStarts.length === 0) {
    console.error("Пустое окно дат (проверьте системное время).");
    process.exit(1);
  }
  const weights = dayWeights(dayStarts, rng);

  const nonWaiterTitles = buildNonWaiterJobTitles();
  shuffleInPlace(nonWaiterTitles, rng);

  const jobBucket: Array<"W" | "O"> = [];
  const waiterCount = Math.round(count * 0.7);
  for (let i = 0; i < waiterCount; i++) jobBucket.push("W");
  while (jobBucket.length < count) jobBucket.push("O");
  shuffleInPlace(jobBucket, rng);

  const goals = buildSavingGoals(count, rng);
  let otherTitleIdx = 0;

  const usedLogins = new Set<string>();

  fs.writeFileSync(
    outFile,
    [
      `# bulk seed recipients — ${new Date().toISOString()}`,
      `# count=${count} PRNG_seed=${seedNum}`,
      `# login\temail\tpassword\trecoveryCodeword\tphone\tclientNickname\tclientJobTitle\tuser_createdAt_ISO`,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Запись учётных данных: ${outFile}`);
  console.log(`Окно регистраций (МСК): ${rangeStart.toISOString()} … ${rangeEnd.toISOString()}, дней: ${dayStarts.length}`);

  for (let i = 0; i < count; i++) {
    const dayIdx = pickWeightedDayIndex(weights, rng);
    const userAt = randomTimeOnMskDay(dayStarts[dayIdx]!, rng, rangeEnd);

    const reviewLagMs = (0.5 + rng() * 4) * 60 * 60 * 1000;
    const requestLagMs = (6 + rng() * 96) * 60 * 60 * 1000;
    let reviewedAt = new Date(userAt.getTime() - reviewLagMs);
    let requestCreatedAt = new Date(reviewedAt.getTime() - requestLagMs);
    if (requestCreatedAt.getTime() < rangeStart.getTime() - 20 * MSK_DAY_MS) {
      requestCreatedAt = new Date(rangeStart.getTime() - 3 * MSK_DAY_MS);
    }
    if (reviewedAt.getTime() <= requestCreatedAt.getTime()) {
      reviewedAt = new Date(requestCreatedAt.getTime() + 30 * 60 * 1000);
    }
    if (reviewedAt.getTime() >= userAt.getTime()) {
      reviewedAt = new Date(userAt.getTime() - 15 * 60 * 1000);
    }

    const fn = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]!;
    const ln = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]!;
    const fullName = `${fn} ${ln}`;
    const birthDate = randomBirthDate(rng);
    const establishment = ESTABLISHMENTS[Math.floor(rng() * ESTABLISHMENTS.length)]!;
    const phone = randomPhone10(rng);
    const activityVariants = [
      "Обслуживание гостей, приём заказов",
      "Работа в зале и на барной стойке",
      "Сервис, консультация по меню",
      "Смена в заведении, работа с кассой пречека",
      "Гостевой сервис и организация посадки",
    ];
    const activityType = activityVariants[Math.floor(rng() * activityVariants.length)]!;

    const nick = randomNickname(rng);

    const clientJobTitle =
      jobBucket[i] === "W" ? "Официант" : (nonWaiterTitles[otherTitleIdx++ % nonWaiterTitles.length] ?? "Бармен в баре");
    const savingFor = goals[i] ?? "Коплю на личные цели.";

    const password = generatePassword(rng);
    const recoveryCodeword = generateRecoveryCodeword(rng);
    const passwordHash = await hashPassword(password);
    const recoveryCodewordHash = await hashPassword(recoveryCodeword);
    const recoveryCodewordEnc = encryptRecoveryCodewordForAdminDisplay(recoveryCodeword);

    let attempt = 0;
    let lastErr: unknown;

    while (attempt < 12) {
      attempt += 1;
      let loginTry = uniqueLoginFromNickname(`${nick}_t${attempt}`, rng);
      while (usedLogins.has(loginTry)) {
        loginTry = uniqueLoginFromNickname(`${nick}_${Math.floor(rng() * 1e6)}`, rng);
      }
      const domain = EMAIL_DOMAINS[Math.floor(rng() * EMAIL_DOMAINS.length)]!;
      const emailLocal = `${loginTry}`.replace(/[^a-zA-Z0-9._+-]/g, "_").slice(0, 60);
      const emailTry = `${emailLocal}@${domain}`.toLowerCase();

      const plainRegToken = generateRegistrationToken();
      const tokenHash = hashRegistrationToken(plainRegToken);
      const expiresAt = getRegistrationTokenExpiresAt();

      try {
        await prisma.$transaction(async (tx) => {
          const slug = await allocateNextGlobalWaiterCode(tx);

          const regTok = await tx.registrationToken.create({
            data: {
              tokenHash,
              createdById: superAdmin.id,
              expiresAt,
              createdAt: reviewedAt,
              usedAt: userAt,
            },
            select: { id: true },
          });

          // INSERT сырьём: на сервере старый Prisma Client не принимает reviewedAt / registrationTokenId в .create().
          const registrationRequestId = randomUUID();
          await tx.$executeRaw`
            INSERT INTO "registration_requests" (
              "id",
              "requestType",
              "fullName",
              "dateOfBirth",
              "establishment",
              "phone",
              "activityType",
              "email",
              "status",
              "rejectionReason",
              "reviewedAt",
              "reviewedByUserId",
              "registrationTokenId",
              "createdAt",
              "companyName",
              "companyRole",
              "employeeCount",
              "adminFullName",
              "adminContactPhone"
            ) VALUES (
              ${registrationRequestId},
              ${"individual"},
              ${fullName},
              ${birthDate},
              ${establishment},
              ${phone},
              ${activityType},
              ${emailTry},
              ${Prisma.raw(`'APPROVED'::"RegistrationRequestStatus"`)},
              NULL,
              ${reviewedAt},
              ${superAdmin.id},
              ${regTok.id},
              ${requestCreatedAt},
              NULL,
              NULL,
              NULL,
              NULL,
              NULL
            )
          `;

          // Пользователь — INSERT сырьём: старый Prisma Client не принимает recoveryCodeword* и часть полей в .create().
          const userId = randomUUID();
          const paygineSdRef = getWaiterPaygineSdRef(userId);
          const ldc = limits.payoutDailyLimitCount as number | null | undefined;
          const ldk = limits.payoutDailyLimitKop as bigint | null | undefined;
          const lmc = limits.payoutMonthlyLimitCount as number | null | undefined;
          const lmk = limits.payoutMonthlyLimitKop as bigint | null | undefined;
          const imk = limits.incomingMonthlyLimitKop as bigint | null | undefined;
          const acp = Boolean(limits.autoConfirmPayouts ?? false);
          const act = limits.autoConfirmPayoutThresholdKop as bigint | null | undefined;

          await tx.$executeRaw`
            INSERT INTO "users" (
              "id",
              "login",
              "email",
              "passwordHash",
              "recoveryCodewordHash",
              "recoveryCodewordEnc",
              "role",
              "mustChangePassword",
              "isBlocked",
              "fullName",
              "birthDate",
              "savingFor",
              "clientNickname",
              "clientJobTitle",
              "payoutDailyLimitCount",
              "payoutDailyLimitKop",
              "payoutMonthlyLimitCount",
              "payoutMonthlyLimitKop",
              "incomingMonthlyLimitKop",
              "autoConfirmPayouts",
              "autoConfirmPayoutThresholdKop",
              "paygineSdRef",
              "verificationStatus",
              "createdAt",
              "updatedAt"
            ) VALUES (
              ${userId},
              ${loginTry},
              ${emailTry},
              ${passwordHash},
              ${recoveryCodewordHash},
              ${recoveryCodewordEnc},
              ${Prisma.raw(`'RECIPIENT'::"UserRole"`)},
              false,
              false,
              ${fullName},
              ${birthDate},
              ${savingFor.slice(0, 500)},
              ${nick.slice(0, 120)},
              ${clientJobTitle.slice(0, 120)},
              ${ldc ?? null},
              ${ldk ?? null},
              ${lmc ?? null},
              ${lmk ?? null},
              ${imk ?? null},
              ${acp},
              ${act ?? null},
              ${paygineSdRef},
              ${Prisma.raw(`'NONE'::"VerificationStatus"`)},
              ${userAt},
              ${userAt}
            )
          `;

          const user = { id: userId };

          await tx.tipLink.create({
            data: {
              userId: user.id,
              slug,
              createdAt: userAt,
            },
          });

          await tx.registrationToken.update({
            where: { id: regTok.id },
            data: { usedById: user.id, usedAt: userAt },
          });
        });

        usedLogins.add(loginTry);

        fs.appendFileSync(
          outFile,
          `${loginTry}\t${emailTry}\t${password}\t${recoveryCodeword}\t${phone}\t${nick}\t${clientJobTitle}\t${userAt.toISOString()}\n`,
          "utf8",
        );

        if ((i + 1) % 50 === 0 || i === 0) console.log(`… готово ${i + 1} / ${count}`);
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        const code = (e as { code?: string })?.code;
        if (code === "P2002") continue;
        throw e;
      }
    }
    if (lastErr) {
      console.error(`Сбой на записи ${i + 1}:`, lastErr);
      process.exit(1);
    }
  }

  console.log(`Готово: ${count} пользователей, заявки APPROVED + токены использованы. Учётные данные: ${outFile}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
