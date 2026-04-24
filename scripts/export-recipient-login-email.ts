/**
 * @deprecated по смыслу старого имени: формат id/login/email больше не используется.
 * Тот же экспорт, что scripts/export-waiter-code-login-password.ts (код официанта, логин, пароль).
 */
import { runExportWaiterCredentials } from "./export-waiter-code-login-password";

runExportWaiterCredentials().catch((e) => {
  console.error(e);
  process.exit(1);
});
