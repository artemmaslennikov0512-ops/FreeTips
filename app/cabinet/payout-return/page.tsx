"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight, HelpCircle, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";

const REDIRECT_DELAY_MS = 4000;

export default function CabinetPayoutReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<{
    status: string;
    amountKop?: number;
    alreadyProcessed?: boolean;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    const payoutId = searchParams.get("payoutId");
    const success = searchParams.get("success");
    if (!payoutId || (success !== "0" && success !== "1")) {
      setResult({ status: "unknown", error: "Неверные параметры возврата" });
      setLoading(false);
      return;
    }

    fetch(`/api/payouts/return?payoutId=${encodeURIComponent(payoutId)}&success=${success}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (data.error && res.status >= 400) {
          setResult({ status: "error", error: data.error });
        } else {
          setResult({
            status: data.status ?? "unknown",
            amountKop: data.amountKop,
            alreadyProcessed: data.alreadyProcessed,
          });
        }
        return data;
      })
      .catch(() => setResult({ status: "error", error: "Ошибка соединения" }))
      .finally(() => setLoading(false));
  }, [router, searchParams]);

  // Автопереход в историю операций при ошибке/неизвестном результате
  const isUnclear = result != null && result.status !== "COMPLETED" && result.status !== "REJECTED";
  useEffect(() => {
    if (!isUnclear) return;
    const t = setTimeout(() => router.replace("/cabinet/transactions"), REDIRECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [isUnclear, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--color-brand-gold)]" />
        <div className="text-[var(--color-text-secondary)]">Проверка результата операции…</div>
      </div>
    );
  }

  const isSuccess = result?.status === "COMPLETED";
  const isRejected = result?.status === "REJECTED";

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8 text-center">
      {isSuccess && (
        <>
          <div className="flex justify-center">
            <span className="pay-result-icon pay-result-icon-success inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-emerald)]/15">
              <CheckCircle2 className="h-10 w-10 text-[var(--color-accent-emerald)]" />
            </span>
          </div>
          <h2 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">
            Вывод выполнен
          </h2>
          {result.amountKop != null && (
            <p className="text-lg text-[var(--color-text)]">
              {formatMoney(BigInt(result.amountKop))} переведены на карту.
            </p>
          )}
          {result.alreadyProcessed && (
            <p className="text-sm text-[var(--color-text-secondary)]">Эта заявка уже была обработана ранее.</p>
          )}
        </>
      )}

      {isRejected && (
        <>
          <div className="flex justify-center">
            <span className="pay-result-icon pay-result-icon-error inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-red)]/15">
              <XCircle className="h-10 w-10 text-[var(--color-accent-red)]" />
            </span>
          </div>
          <h2 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">
            Вывод не выполнен
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            Операция была отменена или завершилась с ошибкой. Средства остались на вашем балансе.
          </p>
        </>
      )}

      {isUnclear && (
        <>
          <div className="flex justify-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]/20">
              <HelpCircle className="h-10 w-10 text-[var(--color-muted)]" />
            </span>
          </div>
          <h2 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">
            Результат операции
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            {result.error ?? "Не удалось определить результат. Проверьте историю операций."}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Через {REDIRECT_DELAY_MS / 1000} сек. вы будете перенаправлены в историю операций.
          </p>
        </>
      )}

      <div className="pt-4">
        <Link
          href="/cabinet/transactions"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-navy)] px-5 py-3 font-semibold text-white transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
        >
          К истории операций
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
