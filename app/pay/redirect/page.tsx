/**
 * Редирект на платёжную форму Paygine — только оплата картой (SDPayIn).
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { getPaygineConfig, getAppUrl } from "@/lib/config";
import { createPayRedirectToken } from "@/lib/payment/redirect-token";
import { PayNoticeFrame } from "@/components/pay/PayNoticeFrame";
import {
  PAY_MSG_GATEWAY_NOT_CONFIGURED,
  PAY_MSG_TRANSACTION_ALREADY_FINAL,
  PAY_MSG_TRANSACTION_INVALID_DATA,
  PAY_MSG_TRANSACTION_NOT_FOUND,
} from "@/lib/copy/client-facing-messages";
import { PAY_NOTICE_LINK_HOME } from "@/lib/pay-ui-classes";

export default async function PayRedirectPage({ searchParams }: { searchParams: Promise<{ tid?: string; method?: string }> }) {
  const { tid, method } = await searchParams;
  if (!tid) redirect("/");
  if (method && method !== "card") redirect(`/pay/redirect?tid=${tid}`);

  const config = getPaygineConfig();
  const APP_BASE_URL = getAppUrl();
  if (!config) {
    return (
      <PayNoticeFrame>
        <p className="text-[var(--color-text-secondary)]">{PAY_MSG_GATEWAY_NOT_CONFIGURED}</p>
      </PayNoticeFrame>
    );
  }

  const tx = await db.transaction.findUnique({
    where: { id: tid },
    select: { id: true, status: true, externalId: true, amountKop: true, paygineOrderSdRef: true },
  });

  if (!tx) {
    return (
      <PayNoticeFrame>
        <p className="text-[var(--color-text)]">{PAY_MSG_TRANSACTION_NOT_FOUND}</p>
        <Link href="/" className={PAY_NOTICE_LINK_HOME}>
          На главную
        </Link>
      </PayNoticeFrame>
    );
  }

  if (tx.status === "SUCCESS") {
    redirect(`/pay/result?tid=${tx.id}&outcome=success`);
  }

  if (tx.status !== "PENDING" || !tx.externalId) {
    return (
      <PayNoticeFrame>
        <p className="text-[var(--color-text)]">{PAY_MSG_TRANSACTION_ALREADY_FINAL}</p>
        <Link href="/" className={PAY_NOTICE_LINK_HOME}>
          На главную
        </Link>
      </PayNoticeFrame>
    );
  }

  const orderId = parseInt(tx.externalId, 10);
  if (!Number.isFinite(orderId)) {
    return (
      <PayNoticeFrame>
        <p className="text-[var(--color-text-secondary)]">{PAY_MSG_TRANSACTION_INVALID_DATA}</p>
      </PayNoticeFrame>
    );
  }

  const orderSdRef = tx.paygineOrderSdRef?.trim();
  if (!orderSdRef || !APP_BASE_URL) {
    return (
      <PayNoticeFrame>
        <p className="text-[var(--color-text-secondary)]">
          {!orderSdRef ? "Не указана кубышка заказа. Создайте платёж заново." : "Задайте NEXT_PUBLIC_APP_URL в окружении."}
        </p>
        <Link href="/" className={PAY_NOTICE_LINK_HOME}>
          На главную
        </Link>
      </PayNoticeFrame>
    );
  }

  const redirectToken = createPayRedirectToken(tx.id);
  const action = "/api/pay/redirect-proxy";

  return (
    <PayNoticeFrame>
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
    </PayNoticeFrame>
  );
}
