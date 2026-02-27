"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/utils";

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
      setResult({ status: "unknown", error: "Неверные параметры" });
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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">Загрузка…</div>
      </div>
    );
  }

  const isSuccess = result?.status === "COMPLETED";
  const isRejected = result?.status === "REJECTED";

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      {isSuccess && (
        <>
          <div className="flex justify-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-gold)]/20">
              <CheckCircle2 className="h-10 w-10 text-[var(--color-brand-gold)]" />
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
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]/20">
              <XCircle className="h-10 w-10 text-[var(--color-text-secondary)]" />
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

      <div className="pt-4">
        <Link
          href="/cabinet/transactions"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-5 py-3 font-semibold text-[#0a192f] transition-all hover:opacity-90"
        >
          К истории операций
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
