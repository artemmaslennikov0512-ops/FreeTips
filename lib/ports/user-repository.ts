/**
 * Порт репозитория пользователей для слоя приложения.
 * Позволяет подменять источник данных (Prisma, моки в тестах) без изменения use case.
 */

export type UserRole = "RECIPIENT" | "ADMIN" | "SUPERADMIN";

/** Минимальный набор полей пользователя для аутентификации и авторизации */
export interface AuthUser {
  id: string;
  login: string;
  email: string | null;
  role: UserRole;
  passwordHash: string;
  mustChangePassword: boolean;
  isBlocked: boolean;
}

export interface IUserRepository {
  /** Найти пользователя по логину для входа */
  findByLogin(login: string): Promise<AuthUser | null>;

  /** Найти пользователя по id (например для смены пароля) */
  findById(id: string): Promise<Pick<AuthUser, "id" | "passwordHash"> | null>;
}
