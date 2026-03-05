/**
 * Одноразовая миграция: для пользователей с apiKey в открытом виде
 * заполняет apiKeyPrefix и apiKeyHash, затем обнуляет apiKey.
 * Запуск после применения миграции 20260227000000_add_api_key_hash:
 *   npx tsx scripts/migrate-api-key-to-hash.ts
 */

import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getApiKeyPrefix(key: string): string {
  return key.slice(0, 16);
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

async function main() {
  const users = await prisma.user.findMany({
    where: { apiKey: { not: null } },
    select: { id: true, apiKey: true },
  });

  console.log(`Найдено пользователей с apiKey: ${users.length}`);

  for (const user of users) {
    const key = user.apiKey!;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        apiKeyPrefix: getApiKeyPrefix(key),
        apiKeyHash: hashApiKey(key),
        apiKey: null,
      },
    });
    console.log(`Обновлён пользователь ${user.id}`);
  }

  console.log("Готово.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
