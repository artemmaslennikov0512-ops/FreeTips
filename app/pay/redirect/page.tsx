/**
 * Редирект на платёжную форму Paygine — только оплата картой (SDPayIn).
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { getPaygineConfig, getAppUrl } from "@/lib/config";
import { buildSDPayInFormParams } from "@/lib/payment/paygine/client";
import { createPayRedirectToken } from "@/lib/payment/redirect-token";

export default async function PayRedirectPage({ searchParams }: { searchParams: Promise<{ tid?: string; method?: string }> }) {
  const { tid, method } = await searchParams;
  if (!tid) redirect("/");
  if (method && method !== "card") redirect(`/pay/redirect?tid=${tid}`);

  const config = getPaygineConfig();
  const APP_BASE_URL = getAppUrl();
  if (!config) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-[var(--color-text-secondary)]">Платёжный шлюз не настроен.</p>
      </div>
    );
  }

  const tx = await db.transaction.findUnique({
    where: { id: tid },
    select: { id: true, status: true, externalId: true, amountKop: true, paygineOrderSdRef: true },
  });

  if (!tx) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-[var(--color-text)]">Платёж не найден.</p>
        <Link href="/" className="mt-4 inline-block text-[var(--color-accent-gold)] hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  if (tx.status === "SUCCESS") {
    redirect(`/pay/result?tid=${tx.id}&outcome=success`);
  }

  if (tx.status !== "PENDING" || !tx.externalId) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-[var(--color-text)]">Платёж уже обработан или отменён.</p>
        <Link href="/" className="mt-4 inline-block text-[var(--color-accent-gold)] hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  const orderId = parseInt(tx.externalId, 10);
  if (!Number.isFinite(orderId)) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-[var(--color-text-secondary)]">Неверные данные платежа.</p>
      </div>
    );
  }

  const orderSdRef = tx.paygineOrderSdRef?.trim();
  if (!orderSdRef || !APP_BASE_URL) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-[var(--color-text-secondary)]">
          {!orderSdRef ? "Не указана кубышка заказа. Создайте платёж заново." : "Задайте NEXT_PUBLIC_APP_URL в окружении."}
        </p>
        <Link href="/" className="mt-4 inline-block text-[var(--color-accent-gold)] hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  const redirectToken = createPayRedirectToken(tx.id);
  const action = "/api/pay/redirect-proxy";

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <p className="text-[var(--color-text)]">Перенаправление на платёжную форму…</p>
      <form id="paygine-form" method="POST" action={action}>
        <input type="hidden" name="tid" value={tx.id} />
        <input type="hidden" name="redirectToken" value={redirectToken} />
        <button
          type="submit"
          className="mt-6 rounded-xl bg-[var(--color-accent-gold)] px-6 py-3 text-[14px] font-semibold text-[var(--color-navy)] hover:opacity-90"
        >
          Перейти к оплате
        </button>
      </form>
      <AutoSubmitForm formId="paygine-form" />
    </div>
  );
}
