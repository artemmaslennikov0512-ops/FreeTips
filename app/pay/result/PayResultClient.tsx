"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ScrollToTopOnMount } from "@/components/ScrollToTopOnMount";
import { PayTelegramSupportBlock } from "@/components/PayTelegramSupportBlock";
import { useTipSettlementConfirmation } from "@/lib/hooks/use-tip-settlement-confirmation";
import {
  PAY_RESULT_CTA_PRIMARY_BLOCK,
  PAY_RESULT_ICON_ERROR,
  PAY_RESULT_ICON_PENDING,
  PAY_RESULT_ICON_SUCCESS,
  PAY_RESULT_SUBTITLE_MUTED,
  PAY_RESULT_TITLE,
  PAY_SUCCESS_CARD_GEOMETRY,
  PAY_SUCCESS_FLOW_OUTER,
} from "@/lib/pay-ui-classes";

type Props = {
  tid?: string | null;
  outcome?: string | null;
};

function SuccessCardBody() {
  return (
    <>
      <div className={PAY_RESULT_ICON_SUCCESS}>
        <CheckCircle2 className="h-9 w-9 text-[var(--color-accent-emerald)]" />
      </div>
      <div className="mt-8 flex flex-col items-center text-center">
        <h1 className={PAY_RESULT_TITLE}>Спасибо!</h1>
        <p className="mt-1 text-center text-lg font-medium text-[#0a192f]">Чаевые зачислены.</p>
        <p className={PAY_RESULT_SUBTITLE_MUTED}>Получатель получил вашу благодарность.</p>
      </div>
    </>
  );
}

function FailCardBody({ subtitle }: { subtitle: string }) {
  return (
    <>
      <div className={PAY_RESULT_ICON_ERROR}>
        <XCircle className="h-9 w-9 text-[var(--color-accent-red)]" />
      </div>
      <div className="mt-8 flex flex-col items-center text-center">
        <h1 className={PAY_RESULT_TITLE}>Оплата не прошла</h1>
        <p className={PAY_RESULT_SUBTITLE_MUTED}>{subtitle}</p>
      </div>
    </>
  );
}

export function PayResultClient({ tid, outcome }: Props) {
  const urlOutcome =
    outcome === "success" ? ("success" as const) : outcome === "fail" ? ("fail" as const) : null;
  const phase = useTipSettlementConfirmation(tid?.trim() || null, urlOutcome);

  if (urlOutcome === "success" && !tid?.trim()) {
    return (
      <div className={PAY_SUCCESS_FLOW_OUTER}>
        <ScrollToTopOnMount />
        <div className={`pay-success-card ${PAY_SUCCESS_CARD_GEOMETRY}`}>
          <SuccessCardBody />
          <Link href="/" className={PAY_RESULT_CTA_PRIMARY_BLOCK}>
            На главную
          </Link>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  if (urlOutcome === "fail" || (urlOutcome === "success" && phase === "fail")) {
    return (
      <div className={PAY_SUCCESS_FLOW_OUTER}>
        <ScrollToTopOnMount />
        <div className={`pay-success-card ${PAY_SUCCESS_CARD_GEOMETRY}`}>
          <FailCardBody subtitle="Платёж был отклонён или отменён. Вы можете попробовать снова на странице получателя." />
          <Link href="/" className={PAY_RESULT_CTA_PRIMARY_BLOCK}>
            На главную
          </Link>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  if (urlOutcome === "success" && phase === "verifying") {
    return (
      <div className={PAY_SUCCESS_FLOW_OUTER}>
        <ScrollToTopOnMount />
        <div className={`pay-success-card ${PAY_SUCCESS_CARD_GEOMETRY}`}>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[var(--color-accent-emerald)]" aria-hidden />
          <p className="mt-6 text-center text-lg font-medium text-[#0a192f]">Подтверждаем зачисление…</p>
          <p className="mt-2 text-center text-sm text-[#2d3748]">Обычно это несколько секунд.</p>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  if (urlOutcome === "success" && phase === "slow") {
    return (
      <div className={PAY_SUCCESS_FLOW_OUTER}>
        <ScrollToTopOnMount />
        <div className={`pay-success-card ${PAY_SUCCESS_CARD_GEOMETRY}`}>
          <div className={PAY_RESULT_ICON_PENDING}>
            <Loader2 className="h-9 w-9 text-amber-600 animate-spin" aria-hidden />
          </div>
          <div className="mt-8 flex flex-col items-center text-center">
            <h1 className={PAY_RESULT_TITLE}>Платёж принят</h1>
            <p className={PAY_RESULT_SUBTITLE_MUTED}>Зачисление на баланс получателя может занять несколько минут.</p>
          </div>
          <Link href="/" className={PAY_RESULT_CTA_PRIMARY_BLOCK}>
            На главную
          </Link>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  const showThanks = outcome === "success" && phase === "success";

  return (
    <div className={PAY_SUCCESS_FLOW_OUTER}>
      <ScrollToTopOnMount />
      <div className={`pay-success-card ${PAY_SUCCESS_CARD_GEOMETRY}`}>
        {showThanks ? (
          <SuccessCardBody />
        ) : (
          <FailCardBody subtitle="Платёж был отклонён или отменён. Вы можете попробовать снова на странице получателя." />
        )}
        <Link href="/" className={PAY_RESULT_CTA_PRIMARY_BLOCK}>
          На главную
        </Link>
      </div>
      <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
    </div>
  );
}
