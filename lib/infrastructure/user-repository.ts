/**
 * Фабрика репозитория пользователей по умолчанию (Prisma).
 * В тестах можно подменить реализацию через мок.
 */

import type { IUserRepository } from "@/lib/ports/user-repository";
import { PrismaUserRepository } from "@/lib/infrastructure/prisma-user-repository";
import { db } from "@/lib/db";

let defaultInstance: IUserRepository | null = null;

/** Возвращает репозиторий пользователей по умолчанию (singleton) */
export function getUserRepository(): IUserRepository {
  if (!defaultInstance) {
    defaultInstance = new PrismaUserRepository(db);
  }
  return defaultInstance;
}

/** Для тестов: подставить мок (вызвать с null для сброса к Prisma) */
export function setUserRepository(repo: IUserRepository | null): void {
  defaultInstance = repo;
}
