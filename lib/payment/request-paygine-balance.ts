/**
 * Запрос баланса кубышки Paygine после зачисления или списания.
 * Вызывается фоново (void), результат не сохраняется — отображение баланса при GET /api/profile всегда запрашивает SDGetBalance.
 */

import { db } from "@/lib/db";
import { getPaygineConfig } from "@/lib/config";
import { sdGetBalance } from "@/lib/payment/paygine/client";

export async function requestPaygineBalance(userId: string): Promise<void> {
  const config = getPaygineConfig();
  if (!config) return;
  const { sector, password } = config;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { paygineSdRef: true },
  });
  const sdRef = user?.paygineSdRef?.trim();
  if (!sdRef) return;

  try {
    await sdGetBalance({ sector, password }, { sdRef });
  } catch {
    // фоновый запрос, ошибки не пробрасываем
  }
}
