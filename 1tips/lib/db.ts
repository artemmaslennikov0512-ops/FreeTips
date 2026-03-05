/**
 * Prisma Client singleton для безопасного доступа к БД
 * Использует паттерн singleton для предотвращения множественных подключений
 */

import { PrismaClient } from "@prisma/client";
import { getNodeEnv } from "@/lib/config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDev = () => {
  try {
    return getNodeEnv() === "development";
  } catch {
    return process.env.NODE_ENV === "development";
  }
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev() ? ["query", "error", "warn"] : ["error"],
  });

try {
  if (typeof window === "undefined" && getNodeEnv() !== "production") {
    globalForPrisma.prisma = db;
  }
} catch {
  if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
  }
}

// Graceful shutdown — основной обработчик в instrumentation.ts (SIGTERM/SIGINT)
if (typeof window === "undefined") {
  process.on("beforeExit", async () => {
    await db.$disconnect();
  });
}
