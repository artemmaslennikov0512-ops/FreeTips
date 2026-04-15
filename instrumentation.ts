/**
 * Запускается при старте Node.js-сервера (next start / dev).
 * Запуск периодической очистки in-memory rate limit и регистрация graceful shutdown.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV === "production" && (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1")) {
      const { logWarn } = await import("@/lib/logger");
      logWarn("security.trust_proxy_enabled", {
        hint: "TRUST_PROXY: учитываются заголовки прокси. Допустимо только если Node недоступен из интернета напрямую и IP задаёт reverse proxy/CDN.",
      });
    }

    const { startRateLimitCleanup } = await import("@/lib/middleware/rate-limit");
    startRateLimitCleanup();

    const { db } = await import("@/lib/db");
    const shutdown = async () => {
      await db.$disconnect();
      const { closeRedis } = await import("@/lib/rate-limit-redis");
      await closeRedis();
      process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
}
