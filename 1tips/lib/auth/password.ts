/**
 * Хеширование и проверка паролей
 * Использует bcryptjs (асинхронная версия bcrypt)
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12; // Рекомендуется 10-12 для баланса безопасности и производительности

/**
 * Хеширует пароль
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Проверяет пароль
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
