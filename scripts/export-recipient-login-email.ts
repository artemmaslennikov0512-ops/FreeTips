/**
 * Выгрузка из БД: id, login, email для получателей (RECIPIENT).
 * Пароли в БД нет — только то, что видно в таблице users.
 *
 * Примеры:
 *   npx tsx scripts/export-recipient-login-email.ts > recipients.tsv
 *   SEED_EXPORT_OUT=./recipients.tsv SEED_EXPORT_CREATED_AFTER=2026-03-01 npx tsx scripts/export-recipient-login-email.ts
 *
 * SEED_EXPORT_CREATED_AFTER — опционально ISO-дата (UTC): только пользователи с createdAt >= этой даты.
 */

import "dotenv/config";
import * as fs from "node:fs";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const outPath = process.env.SEED_EXPORT_OUT?.trim();
  const afterRaw = process.env.SEED_EXPORT_CREATED_AFTER?.trim();

  const where: Prisma.UserWhereInput = { role: "RECIPIENT" };
  if (afterRaw) {
    const d = new Date(afterRaw);
    if (Number.isNaN(d.getTime())) {
      console.error("Некорректный SEED_EXPORT_CREATED_AFTER");
      process.exit(1);
    }
    where.createdAt = { gte: d };
  }

  const rows = await prisma.user.findMany({
    where,
    select: { id: true, login: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 50_000,
  });

  const lines = ["id\tlogin\temail\tcreatedAt_iso", ...rows.map((r) => `${r.id}\t${r.login}\t${r.email ?? ""}\t${r.createdAt.toISOString()}`)];
  const body = `${lines.join("\n")}\n`;

  if (outPath) {
    fs.writeFileSync(outPath, body, "utf8");
    console.error(`Записано: ${outPath} (${rows.length} строк)`);
  } else {
    process.stdout.write(body);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
