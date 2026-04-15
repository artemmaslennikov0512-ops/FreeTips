/**
 * Удаляет устаревшее поле user.apiKey (plaintext), если уже есть apiKeyHash.
 * Запуск: node scripts/clear-plaintext-api-keys.mjs
 * Требуется DATABASE_URL в окружении.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const result = await db.user.updateMany({
    where: { apiKey: { not: null }, apiKeyHash: { not: null } },
    data: { apiKey: null },
  });
  console.log(`Updated ${result.count} user(s): cleared plaintext apiKey where hash exists.`);
} finally {
  await db.$disconnect();
}
