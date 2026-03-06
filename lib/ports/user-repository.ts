/**
 * Порт репозитория пользователей для слоя приложения.
 * Позволяет подменять источник данных (Prisma, моки в тестах) без изменения use case.
 */

export type UserRole =
  | "RECIPIENT"
  | "ADMIN"
  | "SUPERADMIN"
  | "ESTABLISHMENT_ADMIN"
  | "EMPLOYEE";

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

/** Данные пользователя, достаточные для проверки доступа в auth-middleware */
export type UserAuthSnapshot = {
  id: string;
  role: UserRole;
  isBlocked: boolean;
};

export interface IUserRepository {
  /** Найти пользователя по логину для входа */
  findByLogin(login: string): Promise<AuthUser | null>;

  /** Найти пользователя по id (например для смены пароля) */
  findById(id: string): Promise<Pick<AuthUser, "id" | "passwordHash"> | null>;

  /** Данные для проверки доступа: существование, блокировка, роль (для middleware) */
  findByIdForAuth(id: string): Promise<UserAuthSnapshot | null>;

  /** establishmentId пользователя (для ESTABLISHMENT_ADMIN); null если нет */
  findEstablishmentIdByUserId(userId: string): Promise<string | null>;
}
