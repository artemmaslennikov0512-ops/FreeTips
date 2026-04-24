/**
 * Удаление пользователей-получателей, у которых в логине есть шаблон «_t» + цифры
 * (артефакт первых версий seed-bulk-recipients.ts).
 *
 * Перед удалением: заявки на подключение с тем же email, связанные registration_tokens.
 *
 * Запуск (из корня репозитория):
 *   DRY_RUN=1 npx tsx scripts/delete-bulk-seed-users.ts   — только список и счётчик
 *   CONFIRM_DELETE_BULK_SEED_USERS=YES npx tsx scripts/delete-bulk-seed-users.ts
 *
 * Критерий по умолчанию: role = RECIPIENT и login содержит подстроку "_t" (регистронезависимо).
 * Переопределить: SEED_DELETE_LOGIN_CONTAINS=_t
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_MARKER = "_t";

async function main() {
  const dry = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const marker = (process.env.SEED_DELETE_LOGIN_CONTAINS ?? DEFAULT_MARKER).trim() || DEFAULT_MARKER;

  if (!dry && process.env.CONFIRM_DELETE_BULK_SEED_USERS !== "YES") {
    console.error("Укажите CONFIRM_DELETE_BULK_SEED_USERS=YES или DRY_RUN=1");
    process.exit(1);
  }

  const victims = await prisma.user.findMany({
    where: {
      role: "RECIPIENT",
      login: { contains: marker, mode: "insensitive" },
    },
    select: { id: true, login: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Найдено: ${victims.length} пользователей (login содержит "${marker}", RECIPIENT)`);
  if (victims.length === 0) {
    return;
  }
  if (victims.length <= 20) {
    for (const v of victims) console.log(`  ${v.login}\t${v.email ?? ""}`);
  } else {
    for (const v of victims.slice(0, 5)) console.log(`  ${v.login}\t${v.email ?? ""}`);
    console.log(`  … и ещё ${victims.length - 5}`);
  }

  if (dry) {
    console.log("DRY_RUN: удаление не выполнялось.");
    return;
  }

  for (const u of victims) {
    const email = u.email?.trim();
    if (email) {
      const reqs = await prisma.registrationRequest.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, registrationTokenId: true },
      });
      const tokenIds = [...new Set(reqs.map((r) => r.registrationTokenId).filter((x): x is string => !!x))];
      if (reqs.length > 0) {
        await prisma.registrationRequest.deleteMany({ where: { id: { in: reqs.map((r) => r.id) } } });
      }
      if (tokenIds.length > 0) {
        await prisma.registrationToken.deleteMany({ where: { id: { in: tokenIds } } });
      }
    }
    await prisma.tipLink.deleteMany({ where: { userId: u.id } });
    try {
      await prisma.user.delete({ where: { id: u.id } });
    } catch (e) {
      console.error(`Не удалось удалить пользователя ${u.login} (${u.id}) — возможны транзакции/выплаты. Удалите вручную.`, e);
    }
  }

  console.log(`Удалено пользователей: ${victims.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
