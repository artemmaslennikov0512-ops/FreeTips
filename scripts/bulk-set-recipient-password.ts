/**
 * Единый временный пароль для пачки получателей (RECIPIENT) + обязательная смена при входе.
 *
 * Просмотр (сколько заденет):
 *   DRY_RUN=1 \\
 *   BULK_RECIPIENT_CREATED_AFTER=2026-03-01 \\
 *   npx tsx scripts/bulk-set-recipient-password.ts
 *
 * Применить (пароль из env, не коммить в репозиторий):
 *   CONFIRM_BULK_RECIPIENT_PASSWORD_RESET=YES \\
 *   BULK_RECIPIENT_NEW_PASSWORD='Временный1' \\
 *   BULK_RECIPIENT_CREATED_AFTER=2026-03-01 \\
 *   npx tsx scripts/bulk-set-recipient-password.ts
 *
 * Опционально верхняя граница по дате (UTC): BULK_RECIPIENT_CREATED_BEFORE=2026-04-25
 * Лимит строк (страховка): BULK_RECIPIENT_MAX=2000
 *
 * Пароль должен проходить правила приложения: ≥8 символов, буква и цифра (см. lib/validations passwordSchema).
 */

import "dotenv/config";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { passwordSchema } from "../lib/validations";

const prisma = new PrismaClient();

async function main() {
  const dry = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const confirm = process.env.CONFIRM_BULK_RECIPIENT_PASSWORD_RESET === "YES";
  const plain = process.env.BULK_RECIPIENT_NEW_PASSWORD ?? "";
  const afterRaw = process.env.BULK_RECIPIENT_CREATED_AFTER?.trim();
  const beforeRaw = process.env.BULK_RECIPIENT_CREATED_BEFORE?.trim();
  const maxRaw = process.env.BULK_RECIPIENT_MAX?.trim();

  if (!afterRaw) {
    console.error("Обязательно BULK_RECIPIENT_CREATED_AFTER=YYYY-MM-DD (UTC) — нижняя граница createdAt.");
    process.exit(1);
  }
  const after = new Date(afterRaw);
  if (Number.isNaN(after.getTime())) {
    console.error("Некорректный BULK_RECIPIENT_CREATED_AFTER");
    process.exit(1);
  }
  let before: Date | undefined;
  if (beforeRaw) {
    before = new Date(beforeRaw);
    if (Number.isNaN(before.getTime())) {
      console.error("Некорректный BULK_RECIPIENT_CREATED_BEFORE");
      process.exit(1);
    }
  }
  let max = 10_000;
  if (maxRaw) {
    max = Number.parseInt(maxRaw, 10);
    if (!Number.isFinite(max) || max < 1) {
      console.error("Некорректный BULK_RECIPIENT_MAX");
      process.exit(1);
    }
  }

  const where: Prisma.UserWhereInput = {
    role: "RECIPIENT",
    createdAt: before ? { gte: after, lte: before } : { gte: after },
  };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, login: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: max + 1,
  });

  if (users.length > max) {
    console.error(
      `Под условие попало больше ${max} пользователей — оборвалось. Ужми окно дат или увеличь BULK_RECIPIENT_MAX.`,
    );
    process.exit(1);
  }

  console.error(`К обработке: ${users.length} RECIPIENT (createdAt ${after.toISOString()}${before ? ` … ${before.toISOString()}` : ""}, max ${max})`);

  if (dry) {
    console.error("DRY_RUN: обновлений не будет.");
    return;
  }

  if (!confirm) {
    console.error("Для записи в БД задайте CONFIRM_BULK_RECIPIENT_PASSWORD_RESET=YES (или DRY_RUN=1 для просмотра).");
    process.exit(1);
  }

  const pwdCheck = passwordSchema.safeParse(plain);
  if (!pwdCheck.success) {
    console.error("BULK_RECIPIENT_NEW_PASSWORD не проходит проверку:", pwdCheck.error.flatten().formErrors.join("; "));
    process.exit(1);
  }

  const ids = users.map((u) => u.id);
  if (ids.length === 0) {
    console.error("Нет пользователей под условие.");
    return;
  }

  const passwordHash = await hashPassword(pwdCheck.data);

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: { in: ids } },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });
    await tx.session.deleteMany({ where: { userId: { in: ids } } });
  });

  console.error(`Готово: обновлено ${ids.length} пользователей, сессии сброшены, mustChangePassword=true.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
