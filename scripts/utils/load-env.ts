/**
 * Подстановка переменных в process.env для скриптов (tsx из корня репозитория).
 *
 * Порядок (каждый файл только дополняет уже пустые ключи — не затирает shell и ранее заданное):
 *   1) .env в корне проекта — как на сервере с docker-compose (env_file: .env)
 *   2) .env.local в корне — локальные переопределения без коммита (как у Next.js)
 *   3) scripts/.env — опционально, только недостающие ключи
 *
 * Запуск: из каталога проекта, например `cd ~/1tips && npx tsx scripts/utils/sd-payout-page.ts …`
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

function applyEnvFile(absPath: string): void {
  if (!existsSync(absPath)) return;
  try {
    const content = readFileSync(absPath, "utf8");
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

/** Загрузка .env с сервера (корень) и при необходимости scripts/.env. */
export function loadScriptsEnv(): void {
  const cwd = process.cwd();
  applyEnvFile(join(cwd, ".env"));
  applyEnvFile(join(cwd, ".env.local"));
  applyEnvFile(join(cwd, "scripts", ".env"));
}
