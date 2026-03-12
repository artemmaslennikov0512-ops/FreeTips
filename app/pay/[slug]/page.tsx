"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, User, Smartphone, CreditCard } from "lucide-react";
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
  const searchParams = useSearchParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [loading, setLoading] = useState(true);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [branding, setBranding] = useState<{
    logoUrl?: string;
    logoOpacityPercent?: number | null;
    primaryColor?: string;
    secondaryColor?: string;
    mainBackgroundColor?: string;
    blocksBackgroundColor?: string;
    fontColor?: string;
    borderColor?: string;
  } | null>(null);
  const [recipientPhotoUrl, setRecipientPhotoUrl] = useState<string | null>(null);
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
      QRCode.toDataURL(url, { width: 128, margin: 1 }).then(setQrDataUrl).catch(() => {});
    }
  }, [slug]);

  useEffect(() => {
    const tid = searchParams.get("tid");
    const outcome = searchParams.get("outcome");
    if (tid && (outcome === "success" || outcome === "fail")) {
      setResult(outcome);
      return;
    }
  }, [searchParams]);

  // На мобильном после редиректа с Paygine позиция прокрутки может остаться внизу — прокручиваем к блоку «Спасибо»
  useEffect(() => {
    if (result === "success") {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [result]);

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
        const data = (await res.json()) as {
          recipientName: string;
          savingFor?: string;
          recipientPhotoUrl?: string;
          branding?: {
            logoUrl?: string;
            logoOpacityPercent?: number | null;
            primaryColor?: string;
            secondaryColor?: string;
            mainBackgroundColor?: string;
            blocksBackgroundColor?: string;
            fontColor?: string;
            borderColor?: string;
          };
        };
        setRecipientName(data.recipientName);
        setSavingFor(data.savingFor ?? null);
        setRecipientPhotoUrl(data.recipientPhotoUrl ?? null);
        setBranding(data.branding ?? null);
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
      <div className="pay-success-always-light flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8">
        <div className="pay-success-card w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/40 bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <div className="pay-result-icon pay-result-icon-success mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-emerald)]/15">
            <CheckCircle2 className="h-9 w-9 text-[var(--color-accent-emerald)]" />
          </div>
          <div className="mt-8 flex flex-col items-center text-center">
            <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[#0a192f]">
              Спасибо!
            </h1>
            <p className="mt-1 text-center text-lg font-medium text-[#0a192f]">Чаевые зачислены.</p>
            <p className="mt-3 text-center text-sm text-[#2d3748]">
              {(recipientName ?? "Получатель")} получил вашу благодарность.
            </p>
          </div>
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
              className="rounded-xl border border-[#0a192f]/35 bg-transparent px-5 py-2.5 text-sm font-medium text-[#0a192f] hover:bg-[#0a192f]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a192f]/25"
            >
              Отправить ещё
            </button>
            <Link
              href="/"
              className="rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
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

  const hex = (s: string | undefined) => (s && /^#[0-9A-Fa-f]{6}$/i.test(s) ? s : undefined);
  const primary = hex(branding?.primaryColor);
  const secondary = hex(branding?.secondaryColor);
  const mainBg = hex(branding?.mainBackgroundColor);
  const blocksBg = hex(branding?.blocksBackgroundColor);
  const fontClr = hex(branding?.fontColor);
  const borderClr = hex(branding?.borderColor);
  const payBlockStyle: React.CSSProperties & Record<string, string> = {};
  if (primary) payBlockStyle["--pay-brand-primary"] = primary;
  if (secondary) payBlockStyle["--pay-brand-secondary"] = secondary;
  if (borderClr) payBlockStyle["--pay-border"] = borderClr;
  const wrapperStyle: React.CSSProperties = mainBg ? { backgroundColor: mainBg } : {};
  const cardStyle: React.CSSProperties & Record<string, string> = { ...payBlockStyle };
  if (secondary) cardStyle.backgroundColor = secondary;
  if (borderClr) cardStyle.borderColor = borderClr;
  if (blocksBg) cardStyle["--pay-blocks-bg" as string] = blocksBg;
  if (fontClr) cardStyle["--pay-font" as string] = fontClr;

  return (
    <div className="pay-page pay-page--cards flex min-h-screen w-full flex-col justify-center px-4 py-8" style={wrapperStyle}>
      <div className="mx-auto w-full max-w-md">
        {/* Основной блок со скруглёнными краями и отступами — внутри все карточки */}
        <div
          className="pay-page-outer-block relative rounded-2xl border-0 px-4 pt-5 pb-5 shadow-[var(--shadow-card)]"
        style={Object.keys(cardStyle).length ? cardStyle : undefined}
      >
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        {/* Логотип: только лого заведения или только FreeTips (без дублирования) */}
        <div className="pay-page-logo-wrap flex justify-center">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="h-10 w-auto max-w-[120px] object-contain"
              style={{ opacity: branding?.logoOpacityPercent != null ? branding.logoOpacityPercent / 100 : 1 }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="pay-page-logo-ft logo-ft-abbr flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-gold)] text-sm text-[#0a192f]">FT</span>
              <span
                className="font-[family:var(--font-playfair)] text-lg font-bold pay-page-logo-text"
                style={{ color: fontClr ?? "var(--color-text)" }}
              >
                <span className="pay-page-logo-free" style={{ color: fontClr ? "inherit" : undefined, opacity: fontClr ? undefined : 0.95 }}>Free</span>
                <span className="text-[var(--color-brand-gold)]">Tips</span>
              </span>
            </div>
          )}
        </div>

        {/* Карточка: получатель — обводка до QR, отступ от QR как слева от блока */}
        <div className="pay-page-card card pay-page-recipient-card" style={Object.keys(cardStyle).length ? cardStyle : undefined}>
          <div className="pay-page-recipient pay-page-recipient--with-qr">
            <div className="pay-page-recipient-bordered">
              <div className="pay-page-recipient-profile">
                {recipientPhotoUrl ? (
                  <img
                    src={recipientPhotoUrl}
                    alt=""
                    className="pay-page-recipient-avatar h-14 w-14 shrink-0 rounded-full object-cover bg-[var(--pay-page-accent)]/15"
                  />
                ) : (
                  <div className="pay-page-recipient-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--pay-page-accent)]/15 text-[var(--pay-page-accent)]">
                    <User className="h-6 w-6" />
                  </div>
                )}
                <p className="pay-page-recipient-name min-w-0 truncate flex items-center" style={{ color: fontClr ?? undefined }}>
                  {recipientName}
                </p>
              </div>
            </div>
            {qrDataUrl && (
              <div className="pay-page-recipient-qr shrink-0 flex items-center">
                <img src={qrDataUrl} alt="QR страницы" className="rounded-lg bg-[var(--pay-page-card-bg)] shadow-[0_2px_8px_rgba(0,0,0,0.12)]" width={64} height={64} />
              </div>
            )}
          </div>
        </div>

        {/* Блок только с целью: на что копит официант */}
        <div className="pay-page-saving-goal pay-page-card card" style={Object.keys(cardStyle).length ? cardStyle : undefined}>
          <p className="pay-page-saving-goal-text" style={{ color: fontClr ?? undefined }} title={savingFor?.trim() ? `Коплю на: ${savingFor}` : undefined}>
            {savingFor?.trim() ? `Коплю на: ${savingFor}` : "Коплю на большое счастье"}
          </p>
        </div>

        {/* Карточка: сумма чаевых */}
        <div className="pay-page-card card" style={Object.keys(cardStyle).length ? cardStyle : undefined}>
          <div className="pay-page-amounts">
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
                  className={`pay-page-amount-btn amount-btn ${isSelected ? "is-active active" : ""}`}
                >
                  {r} ₽
                </button>
              );
            })}
          </div>
          <p className="pay-page-label">Выберите сумму или введите свою</p>
          <div className="pay-page-input-wrap custom-amount pay-page-custom-amount-row">
            <input
              type="text"
              inputMode="decimal"
              placeholder="100"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              aria-label="Своя сумма в рублях"
            />
          </div>
        </div>

        {/* Карточка: отзыв */}
        <div className="pay-page-card card" style={Object.keys(cardStyle).length ? cardStyle : undefined}>
          <p className="pay-page-section-title">Отзыв (необязательно)</p>
          <div className="pay-page-input-wrap">
            <textarea
              className="review-textarea"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder="Спасибо за отличный сервис!"
              aria-label="Отзыв"
            />
          </div>
        </div>

        {result === "fail" && resultError && (
          <p className="mt-2 text-center text-sm text-[var(--color-accent-red)]" role="alert">
            {resultError}
          </p>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={paying || kop < 100}
          className="pay-button pay-page-submit"
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

        {/* Пояснения: QR и оплата картой — без внешней карточки */}
        <div className="info-block">
          {qrDataUrl && (
            <div className="info-row">
              <Smartphone className="info-block-icon size-5 shrink-0" aria-hidden />
              <span>Покажите QR — гость отсканирует эту страницу</span>
            </div>
          )}
          <div className="info-row">
            <CreditCard className="info-block-icon size-5 shrink-0" aria-hidden />
            <span>Оплата банковской картой. Регистрация не нужна.</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
