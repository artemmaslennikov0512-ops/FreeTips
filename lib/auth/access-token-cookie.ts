/** Имя httpOnly-cookie с access JWT (браузер). Не путать с устаревшим ключом localStorage `accessToken`. */
export const ACCESS_TOKEN_COOKIE_NAME = "ft_access";

/** Срок cookie = срок access JWT (lib/auth/jwt.ts ACCESS_TOKEN_EXPIRES_IN). */
export const ACCESS_TOKEN_COOKIE_MAX_AGE_SEC = 15 * 60;
