/**
 * Создание пользователя (официант/админ) без токена регистрации.
 * Запуск: npx tsx prisma/create-user.ts <логин> <пароль> [RECIPIENT|ADMIN]
 * Требуется DATABASE_URL в .env
 * Для RECIPIENT применяются дефолты из .env (DEFAULT_RECIPIENT_*), если заданы.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getDefaultRecipientUpdateData } from "../lib/default-recipient-settings";

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

const prisma = new PrismaClient();

async function main() {
  const login = process.argv[2]?.trim();
  const password = process.argv[3]?.trim();
  const roleArg = process.argv[4]?.toUpperCase().trim();

  if (!login || !password) {
    console.error("Использование: npx tsx prisma/create-user.ts <логин> <пароль> [RECIPIENT|ADMIN]");
    process.exit(1);
  }

  const role = roleArg === "ADMIN" ? "ADMIN" : "RECIPIENT";

  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    console.error(`Пользователь с логином "${login}" уже существует.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const createData: Record<string, unknown> = {
    login,
    passwordHash,
    role,
  };
  if (role === "RECIPIENT") {
    Object.assign(createData, getDefaultRecipientUpdateData());
  }
  const user = await prisma.user.create({
    data: createData as Parameters<PrismaClient["user"]["create"]>[0]["data"],
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { paygineSdRef: `FreeTips_w_${user.id}` },
  });

  console.log(`Пользователь создан:`);
  console.log(`  ID:       ${user.id}`);
  console.log(`  Логин:    ${user.login}`);
  console.log(`  Роль:     ${role}`);
  console.log(`  paygineSdRef: FreeTips_w_${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
