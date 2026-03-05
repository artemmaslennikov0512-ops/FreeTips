/**
 * Сохранение и загрузка данных последнего успешного пополнения.
 * Используется: после пополнения (sd-topup-card-auto) — запись; при выводе (sd-payout) — подстановка по умолчанию.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const FILENAME = "scripts/out/last-topup.json";

export type LastTopupData = {
  pan: string;
  amountKop: number;
  orderId: string;
  timestamp: string;
};

function getPath(): string {
  return join(process.cwd(), FILENAME);
}

export function saveLastTopup(data: LastTopupData): void {
  const path = getPath();
  const dir = join(path, "..");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

export function loadLastTopup(): LastTopupData | null {
  const path = getPath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === "object" && "pan" in data && "amountKop" in data) {
      return {
        pan: String((data as { pan: unknown }).pan).replace(/\s/g, ""),
        amountKop: Number((data as { amountKop: unknown }).amountKop),
        orderId: String((data as { orderId?: unknown }).orderId ?? ""),
        timestamp: String((data as { timestamp?: unknown }).timestamp ?? ""),
      };
    }
  } catch {
    // ignore
  }
  return null;
}
