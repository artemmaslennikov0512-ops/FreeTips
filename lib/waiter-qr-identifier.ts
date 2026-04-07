/**
 * Глобальный порядковый код официанта (NNN-NNN): одна последовательность на всю платформу.
 * Выдаётся при: личной ссылке оплаты (TipLink.slug), сотруднике заведения (qrCodeIdentifier + TipLink.slug),
 * создании заведения (uniqueSlug пула в /pay). Удобно для привязок, заявок, чеков — без путаницы префиксов.
 */

import type { Prisma } from "@prisma/client";

const GLOBAL_SEQ_ID = "global";
const MAX_GLOBAL_SERIAL = 999_999;

export class WaiterQrIdentifierExhaustedError extends Error {
  constructor() {
    super("Исчерпана глобальная нумерация кодов официанта. Обратитесь в поддержку.");
    this.name = "WaiterQrIdentifierExhaustedError";
  }
}

/** Сериал 1…999999 → «000-001»… (шесть цифр, разбивка 3+3). */
export function formatGlobalWaiterCode(serial: number): string {
  if (serial < 1 || serial > MAX_GLOBAL_SERIAL) {
    throw new WaiterQrIdentifierExhaustedError();
  }
  const s = String(serial).padStart(6, "0");
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

/** «000-001» → 1 (строгий формат NNN-NNN). Для интеграций и чеков. */
export function parseGlobalWaiterCodeString(code: string): number | null {
  const m = code.match(/^(\d{3})-(\d{3})$/);
  if (!m) return null;
  const n = parseInt(`${m[1]}${m[2]}`, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

async function isWaiterCodeTakenGlobally(tx: Prisma.TransactionClient, code: string): Promise<boolean> {
  const [emp, link, est] = await Promise.all([
    tx.employee.findUnique({ where: { qrCodeIdentifier: code } }),
    tx.tipLink.findFirst({ where: { slug: code } }),
    tx.establishment.findUnique({ where: { uniqueSlug: code }, select: { id: true } }),
  ]);
  return !!(emp || link || est);
}

const MAX_ALLOCATION_ATTEMPTS = 50_000;

/**
 * Следующий свободный код из глобальной последовательности (внутри транзакции).
 * Если номер уже занят legacy-данными, он пропускается.
 */
export async function allocateNextGlobalWaiterCode(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < MAX_ALLOCATION_ATTEMPTS; i++) {
    const row = await tx.waiterCodeSequence.update({
      where: { id: GLOBAL_SEQ_ID },
      data: { lastAllocated: { increment: 1 } },
      select: { lastAllocated: true },
    });
    if (row.lastAllocated > MAX_GLOBAL_SERIAL) {
      throw new WaiterQrIdentifierExhaustedError();
    }
    const code = formatGlobalWaiterCode(row.lastAllocated);
    if (!(await isWaiterCodeTakenGlobally(tx, code))) {
      return code;
    }
  }
  throw new Error("Не удалось выделить глобальный код официанта");
}

/** Код сотрудника заведения (= allocateNextGlobalWaiterCode). */
export async function allocateWaiterQrIdentifier(tx: Prisma.TransactionClient): Promise<string> {
  return allocateNextGlobalWaiterCode(tx);
}

/** Код личной ссылки (= allocateNextGlobalWaiterCode). */
export async function allocatePersonalTipLinkSlug(tx: Prisma.TransactionClient): Promise<string> {
  return allocateNextGlobalWaiterCode(tx);
}
