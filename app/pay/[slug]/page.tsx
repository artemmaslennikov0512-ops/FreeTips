"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, User } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ThemeToggle } from "@/components/ThemeToggle";
import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/get-base-url";
import { getCsrfHeader } from "@/lib/security/csrf-client";

const PRESETS = [50, 100, 200, 500] as const;

function toKopecks(rub: number): number {
  return Math.round(rub * 100);
}

export default function PayPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [loading, setLoading] = useState(true);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [comment, setComment] = useState("");
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<"success" | "fail" | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && slug) {
      const url = `${getBaseUrl()}/pay/${slug}`;
      QRCode.toDataURL(url, { width: 140, margin: 1 }).then(setQrDataUrl).catch(() => {});
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const res = await fetch(`/api/pay/${slug}`);
        if (res.status === 404) {
          setError("Ссылка не найдена");
          return;
        }
        if (!res.ok) {
          setError("Не удалось загрузить страницу");
          return;
        }
        const data = (await res.json()) as { recipientName: string };
        setRecipientName(data.recipientName);
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const amountKop = useCallback((): number => {
    const custom = customAmount.trim();
    if (custom) {
      const n = parseFloat(custom.replace(",", "."));
      return !isNaN(n) && n > 0 ? toKopecks(n) : 0;
    }
    return toKopecks(amount);
  }, [amount, customAmount]);

  const handlePay = async () => {
    const kop = amountKop();
    if (kop < 100) {
      setResultError("Минимальная сумма — 1 ₽");
      setResult("fail");
      return;
    }

    setPaying(true);
    setResult(null);
    setResultError(null);

    const idempotencyKey = `pay-${slug}-${crypto.randomUUID()}`;

    try {
      const res = await fetch(`/api/pay/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({
          amountKop: kop,
          comment: comment.trim() || undefined,
          idempotencyKey,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        redirectUrl?: string;
        transactionId?: string;
      };

      if (!res.ok) {
        setResultError(data.error ?? "Ошибка оплаты");
        setResult("fail");
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      setResult(data.success ? "success" : "fail");
      if (!data.success) setResultError("Платёж не прошёл");
    } catch {
      setResultError("Ошибка соединения");
      setResult("fail");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4">
        <LoadingSpinner message="Загрузка…" className="min-h-[60vh]" />
      </div>
    );
  }

  if (error || !recipientName) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <XCircle className="h-14 w-14 text-[var(--color-text-secondary)]" />
        <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">{error ?? "Ссылка не найдена"}</h1>
        <Link href="/" className="mt-6 text-[var(--color-accent-gold)] hover:opacity-90 hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  if (result === "success") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-8">
        <div className="pay-success-card w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/25 bg-[var(--color-bg-sides)] p-8 text-center shadow-[var(--shadow-card)]">
          <div className="pay-result-icon pay-result-icon-success mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-emerald)]/15">
            <CheckCircle2 className="h-9 w-9 text-[var(--color-accent-emerald)]" />
          </div>
          <h1 className="mt-5 font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">
            Спасибо!
          </h1>
          <p className="mt-1 text-lg font-medium text-[var(--color-text)]">Чаевые зачислены.</p>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            {recipientName} получил вашу благодарность.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setResultError(null);
                setAmount(100);
                setCustomAmount("");
                setComment("");
              }}
              className="rounded-xl border border-[var(--color-brand-gold)]/40 bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-brand-gold)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]/30"
            >
              Отправить ещё
            </button>
            <Link
              href="/"
              className="rounded-xl bg-[var(--color-navy)] px-5 py-2.5 font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
            >
              На главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const kop = amountKop();
  const rub = kop / 100;

  return (
    <div className="mx-auto min-h-[60vh] max-w-md px-4 py-12">
      <div className="pay-block relative rounded-2xl border border-[var(--color-brand-gold)]/50 bg-[var(--color-bg-sides)] p-6 shadow-[var(--shadow-card)]">
        {/* Кнопка смены темы — левый верхний угол блока */}
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        {/* Логотип по центру */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand-gold)] text-sm font-bold text-[#0a192f]">FT</span>
            <span className="font-[family:var(--font-playfair)] text-xl font-bold text-[var(--color-text)]">
              <span className="text-[var(--color-navy)]">Free</span>
              <span className="text-[var(--color-brand-gold)]">Tips</span>
            </span>
          </div>
        </div>

        {/* Деловая визитка */}
        <div className="pay-block-inner mt-4 rounded-xl border border-[var(--color-brand-gold)]/50 bg-[var(--color-light-gray)] p-4 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)]">
              <User className="h-4 w-4" />
            </div>
            <p className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]">{recipientName}</p>
          </div>
        </div>

        <div className="pay-block-inner mt-6 flex flex-wrap justify-center gap-3 rounded-xl border border-[var(--color-brand-gold)]/50 bg-[var(--color-light-gray)]/50 p-3">
          {PRESETS.map((r) => {
            const numCustom = customAmount.trim() ? Number(customAmount.replace(",", ".")) : null;
            const isSelected = (numCustom != null && !Number.isNaN(numCustom) && numCustom === r) || (numCustom == null && amount === r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setAmount(r);
                  setCustomAmount(String(r));
                }}
                className={`min-h-[44px] min-w-[44px] inline-flex flex-col items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation sm:flex-row sm:gap-1 ${
                  isSelected
                    ? "border-0 bg-[var(--color-accent-gold)]/10 text-[var(--color-text)]"
                    : "border-0 bg-[var(--color-light-gray)] text-[var(--color-text)] "
                }`}
              >
                <span>{r} ₽</span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-sm font-medium text-[var(--color-text)]">Выберите сумму или введите свою</p>

        <div className="mt-2 flex justify-center">
          <input
            type="text"
            inputMode="decimal"
            placeholder="100"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="pay-block-inner w-full max-w-sm rounded-xl border border-[var(--color-brand-gold)]/50 bg-white px-4 py-2.5 text-center text-[#0a192f] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]/40"
            aria-label="Своя сумма в рублях"
          />
        </div>

        <p className="mt-6 text-center text-sm font-medium text-[var(--color-text)]">Оставьте отзыв!)</p>
        <div className="mt-2 flex justify-center">
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="Спасибо за отличный сервис!"
            className="pay-block-inner w-full max-w-sm resize-none rounded-xl border border-[var(--color-brand-gold)]/50 bg-white px-4 py-2.5 text-center text-[#0a192f] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]/40"
            aria-label="Отзыв"
          />
        </div>

        {result === "fail" && resultError && (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{resultError}</p>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={paying || kop < 100}
          className="pay-btn-gold mt-6 w-full rounded-xl bg-[var(--color-brand-gold)] py-3 font-semibold text-[#0a192f] transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {paying ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Отправка…
            </span>
          ) : (
            `Оплатить ${rub.toFixed(rub >= 1 ? 0 : 2)} ₽`
          )}
        </button>

        {qrDataUrl && (
          <div className="mt-6 flex flex-col items-center border-0 pt-6">
            <p className="text-sm text-[var(--color-muted)]">Покажите QR — гость отсканирует эту страницу</p>
            <img src={qrDataUrl} alt="QR страницы" className="mt-2 rounded-lg border-0 bg-[var(--color-bg-sides)]" width={140} height={140} />
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        Оплата банковской картой. Регистрация не нужна.
      </p>
    </div>
  );
}
