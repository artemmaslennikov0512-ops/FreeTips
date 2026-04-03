/** Только строковые константы — без Node crypto, чтобы клиентские модули не тянули crypto-browserify/vm. */

export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_COOKIE_PATH = "/";
const HOUR_SECONDS = 60 * 60;
export const CSRF_TOKEN_TTL_SECONDS = 8 * HOUR_SECONDS;
