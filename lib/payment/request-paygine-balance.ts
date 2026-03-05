/**
 * Запрос баланса кубышки Paygine после зачисления или списания.
 * Вызывается фоново (void), результат не сохраняется — отображение баланса при GET /api/profile всегда запрашивает SDGetBalance.
 */

import { db } from "@/lib/db";
import { sdGetBalance } from "@/lib/payment/paygine/client";

export async function requestPaygineBalance(userId: string): Promise<void> {
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  if (!sector || !password) return;

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
