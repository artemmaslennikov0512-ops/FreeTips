"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ScrollToTopOnMount } from "@/components/ScrollToTopOnMount";
import { PayTelegramSupportBlock } from "@/components/PayTelegramSupportBlock";
import { useTipSettlementConfirmation } from "@/lib/hooks/use-tip-settlement-confirmation";

type Props = {
  tid?: string | null;
  outcome?: string | null;
};

export function PayResultClient({ tid, outcome }: Props) {
  const urlOutcome =
    outcome === "success" ? ("success" as const) : outcome === "fail" ? ("fail" as const) : null;
  const phase = useTipSettlementConfirmation(tid?.trim() || null, urlOutcome);

  if (urlOutcome === "success" && !tid?.trim()) {
    return (
      <div className="pay-success-always-light flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8">
        <ScrollToTopOnMount />
        <div className="pay-success-card w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/40 bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <div className="pay-result-icon pay-result-icon-success mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-emerald)]/15">
            <CheckCircle2 className="h-9 w-9 text-[var(--color-accent-emerald)]" />
          </div>
          <div className="mt-8 flex flex-col items-center text-center">
            <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[#0a192f]">
              Спасибо!
            </h1>
            <p className="mt-1 text-center text-lg font-medium text-[#0a192f]">Чаевые зачислены.</p>
            <p className="mt-3 text-center text-sm text-[#2d3748]">Получатель получил вашу благодарность.</p>
          </div>
          <Link
            href="/"
            className="mt-8 inline-block rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
          >
            На главную
          </Link>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  if (urlOutcome === "fail" || (urlOutcome === "success" && phase === "fail")) {
    return (
      <div className="pay-success-always-light flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8">
        <ScrollToTopOnMount />
        <div className="pay-success-card w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/40 bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <div className="pay-result-icon pay-result-icon-error mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-red)]/15">
            <XCircle className="h-9 w-9 text-[var(--color-accent-red)]" />
          </div>
          <div className="mt-8 flex flex-col items-center text-center">
            <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[#0a192f]">Оплата не прошла</h1>
            <p className="mt-3 text-center text-sm text-[#2d3748]">
              Платёж был отклонён или отменён. Вы можете попробовать снова на странице получателя.
            </p>
          </div>
          <Link
            href="/"
            className="mt-8 inline-block rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
          >
            На главную
          </Link>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  if (urlOutcome === "success" && phase === "verifying") {
    return (
      <div className="pay-success-always-light flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8">
        <ScrollToTopOnMount />
        <div className="pay-success-card w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/40 bg-white p-8 text-center shadow-[var(--shadow-card)]">
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
      <div className="pay-success-always-light flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8">
        <ScrollToTopOnMount />
        <div className="pay-success-card w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/40 bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <div className="pay-result-icon mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
            <Loader2 className="h-9 w-9 text-amber-600 animate-spin" aria-hidden />
          </div>
          <div className="mt-8 flex flex-col items-center text-center">
            <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[#0a192f]">Платёж принят</h1>
            <p className="mt-3 text-center text-sm text-[#2d3748]">
              Зачисление на баланс получателя может занять несколько минут.
            </p>
          </div>
          <Link
            href="/"
            className="mt-8 inline-block rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90"
          >
            На главную
          </Link>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  const showThanks = outcome === "success" && phase === "success";

  return (
    <div className="pay-success-always-light flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8">
      <ScrollToTopOnMount />
      <div className="pay-success-card w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/40 bg-white p-8 text-center shadow-[var(--shadow-card)]">
        {showThanks ? (
          <>
            <div className="pay-result-icon pay-result-icon-success mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-emerald)]/15">
              <CheckCircle2 className="h-9 w-9 text-[var(--color-accent-emerald)]" />
            </div>
            <div className="mt-8 flex flex-col items-center text-center">
              <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[#0a192f]">
                Спасибо!
              </h1>
              <p className="mt-1 text-center text-lg font-medium text-[#0a192f]">Чаевые зачислены.</p>
              <p className="mt-3 text-center text-sm text-[#2d3748]">Получатель получил вашу благодарность.</p>
            </div>
          </>
        ) : (
          <>
            <div className="pay-result-icon pay-result-icon-error mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-red)]/15">
              <XCircle className="h-9 w-9 text-[var(--color-accent-red)]" />
            </div>
            <div className="mt-8 flex flex-col items-center text-center">
              <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[#0a192f]">
                Оплата не прошла
              </h1>
              <p className="mt-3 text-center text-sm text-[#2d3748]">
                Платёж был отклонён или отменён. Вы можете попробовать снова на странице получателя.
              </p>
            </div>
          </>
        )}
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
        >
          На главную
        </Link>
      </div>
      <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
    </div>
  );
}
