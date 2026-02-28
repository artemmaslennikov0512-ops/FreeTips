/**
 * Реализация IUserRepository через Prisma.
 * Инфраструктурный адаптер для доступа к пользователям в БД.
 */

import type { IUserRepository, AuthUser } from "@/lib/ports/user-repository";
import type { PrismaClient } from "@prisma/client";

const authSelect = {
  id: true,
  login: true,
  email: true,
  role: true,
  passwordHash: true,
  mustChangePassword: true,
  isBlocked: true,
} as const;

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Поиск по логину без учёта регистра (User и user — один и тот же пользователь). */
  async findByLogin(login: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findFirst({
      where: { login: { equals: login, mode: "insensitive" } },
      select: authSelect,
    });
    return user;
  }

  async findById(id: string): Promise<Pick<AuthUser, "id" | "passwordHash"> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, passwordHash: true },
    });
    return user;
  }
}
