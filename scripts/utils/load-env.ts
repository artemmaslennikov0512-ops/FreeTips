/**
 * Загрузка переменных из scripts/.env в process.env.
 * Вызывать в начале скрипта, чтобы использовать общий .env для всех скриптов в scripts/.
 * Путь: из корня проекта — scripts/.env (при запуске npx tsx scripts/xxx.ts).
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const SCRIPTS_ENV = "scripts/.env";

export function loadScriptsEnv(): void {
  const cwd = process.cwd();
  const envPath = join(cwd, SCRIPTS_ENV);
  if (!existsSync(envPath)) return;
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1).replace(/\\n/g, "\n");
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}
