/**
 * Seed для создания первого суперадмина
 * Запуск: docker compose run --rm web sh -c "npx prisma db seed"
 * Или: docker compose exec web sh -c "npx tsx prisma/seed.ts"
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

const prisma = new PrismaClient();

async function main() {
  const superAdminLogin = process.env.SUPERADMIN_LOGIN || "superadmin";
  let superAdminPassword = process.env.SUPERADMIN_PASSWORD;
  if (!superAdminPassword) {
    if (process.env.NODE_ENV === "production") {
      console.error("В production задайте SUPERADMIN_PASSWORD в окружении.");
      process.exit(1);
    }
    superAdminPassword = "ChangeMe123!";
  }

  console.log(`Создание суперадмина: ${superAdminLogin}...`);

  // Проверяем, существует ли уже суперадмин
  const existing = await prisma.user.findFirst({
    where: { role: "SUPERADMIN" },
  });

  if (existing) {
    console.log("Суперадмин уже существует. Пропускаем создание.");
    return;
  }

  // Проверяем, не занят ли логин
  const loginTaken = await prisma.user.findUnique({
    where: { login: superAdminLogin },
  });

  if (loginTaken) {
    console.error(`Логин ${superAdminLogin} уже занят. Используйте другой логин.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(superAdminPassword);

  const superAdmin = await prisma.user.create({
    data: {
      login: superAdminLogin,
      passwordHash,
      role: "SUPERADMIN",
      mustChangePassword: true, // Обязательная смена при первом входе
    },
  });

  await prisma.user.update({
    where: { id: superAdmin.id },
    data: { paygineSdRef: `FreeTips_w_${superAdmin.id}` },
  });

  console.log(`✅ Суперадмин создан: ${superAdmin.login} (ID: ${superAdmin.id})`);
  console.log(`⚠️  При первом входе необходимо сменить пароль!`);
}

main()
  .catch((e) => {
    console.error("Ошибка seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
