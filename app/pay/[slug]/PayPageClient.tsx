"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTipSettlementConfirmation } from "@/lib/hooks/use-tip-settlement-confirmation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ChevronDown, XCircle, Loader2, User, Star, X } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ThemeToggle } from "@/components/ThemeToggle";
import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/get-base-url";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { isPayPageM5ShellSlug } from "@/config/pay-branding-overrides";
import { PayTelegramSupportBlock } from "@/components/PayTelegramSupportBlock";
import { PAYMENT_MAX_AMOUNT_KOP, PAYMENT_MIN_AMOUNT_KOP } from "@/lib/payment-amount-bounds";
import { PayInlineError } from "@/components/pay/PayInlineError";
import {
  CLIENT_MSG_CONNECTION_ERROR,
  CLIENT_MSG_PAGE_LOAD_FAILED,
  PAY_MSG_LINK_NOT_FOUND,
  PAY_MSG_MIN_AMOUNT_RUB,
  PAY_MSG_PAYMENT_DECLINED,
  PAY_MSG_PAYMENT_GENERIC_ERROR,
} from "@/lib/copy/client-facing-messages";
import {
  PAY_PAGE_CENTERED_NARROW,
  PAY_PAGE_FATAL_HOME_LINK,
  PAY_PAGE_FATAL_WRAP,
  PAY_RESULT_ICON_ERROR,
  PAY_RESULT_ICON_PENDING,
  PAY_RESULT_ICON_SUCCESS,
  PAY_RESULT_SUBTITLE_MUTED,
  PAY_RESULT_TITLE,
  PAY_SUCCESS_CARD_GEOMETRY,
  PAY_SUCCESS_FLOW_OUTER,
} from "@/lib/pay-ui-classes";

const PAYMENT_MAX_ERROR = "Сумма не может превышать 1000 ₽";

/** POST на прокси Paygine без промежуточной страницы `/pay/redirect`. */
function postPayRedirectProxy(tid: string, redirectToken: string): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/pay/redirect-proxy";
  form.style.display = "none";

  const tidInput = document.createElement("input");
  tidInput.type = "hidden";
  tidInput.name = "tid";
  tidInput.value = tid;
  form.appendChild(tidInput);

  const tokenInput = document.createElement("input");
  tokenInput.type = "hidden";
  tokenInput.name = "redirectToken";
  tokenInput.value = redirectToken;
  form.appendChild(tokenInput);

  document.body.appendChild(form);
  form.submit();
}

function toKopecks(rub: number): number {
  return Math.round(rub * 100);
}

/** Сумма из `?amount=` в рублях; только если в допустимых границах платежа. */
function parseLockedAmountKopFromSearch(searchParams: URLSearchParams): number | null {
  const raw = searchParams.get("amount");
  if (raw == null || !String(raw).trim()) return null;
  const n = parseFloat(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const kop = Math.round(n * 100);
  if (kop < PAYMENT_MIN_AMOUNT_KOP || kop > PAYMENT_MAX_AMOUNT_KOP) return null;
  return kop;
}

export default function PayPageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const lockedAmountKop = parseLockedAmountKopFromSearch(searchParams);

  const [payM5Shell, setPayM5Shell] = useState(() => isPayPageM5ShellSlug(slug));

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
  const [acceptPayments, setAcceptPayments] = useState(true);
  const [paymentUnavailableReason, setPaymentUnavailableReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [customAmount, setCustomAmount] = useState("");
  const [comment, setComment] = useState("");
  /** 0 — не выбрано; при оплате добавляется строкой к комментарию для получателя. */
  const [tipRating, setTipRating] = useState(0);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<"success" | "fail" | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setPayM5Shell(isPayPageM5ShellSlug(slug));
  }, [slug]);

  useEffect(() => {
    if (!payM5Shell) {
      setQrDataUrl(null);
      return;
    }
    if (typeof window !== "undefined" && slug) {
      const url = `${getBaseUrl()}/pay/${slug}`;
      QRCode.toDataURL(url, { width: 128, margin: 1 }).then(setQrDataUrl).catch(() => {});
    }
  }, [slug, payM5Shell]);

  const tidFromUrl = searchParams.get("tid");
  const outcomeFromUrl = searchParams.get("outcome");
  const urlOutcome =
    outcomeFromUrl === "success"
      ? ("success" as const)
      : outcomeFromUrl === "fail"
        ? ("fail" as const)
        : null;
  const settlementPhase = useTipSettlementConfirmation(tidFromUrl, urlOutcome);

  // На мобильном после редиректа с Paygine позиция прокрутки может остаться внизу — прокручиваем к блоку «Спасибо»
  useEffect(() => {
    if (result === "success" || (urlOutcome === "success" && settlementPhase === "success")) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [result, urlOutcome, settlementPhase]);

  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const res = await fetch(`/api/pay/${slug}`);
        if (res.status === 404) {
          setError(PAY_MSG_LINK_NOT_FOUND);
          return;
        }
        if (!res.ok) {
          setError(CLIENT_MSG_PAGE_LOAD_FAILED);
          return;
        }
        const data = (await res.json()) as {
          recipientName: string;
          acceptPayments?: boolean;
          paymentUnavailableReason?: string;
          savingFor?: string;
          recipientPhotoUrl?: string;
          m5PayShell?: boolean;
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
        setAcceptPayments(data.acceptPayments !== false);
        setPaymentUnavailableReason(
          typeof data.paymentUnavailableReason === "string" && data.paymentUnavailableReason.trim()
            ? data.paymentUnavailableReason.trim()
            : null,
        );
        setSavingFor(data.savingFor ?? null);
        setRecipientPhotoUrl(data.recipientPhotoUrl ?? null);
        setBranding(data.branding ?? null);
        setPayM5Shell(isPayPageM5ShellSlug(slug) || data.m5PayShell === true);
      } catch {
        setError(CLIENT_MSG_CONNECTION_ERROR);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const amountKop = useCallback((): number => {
    if (lockedAmountKop != null) return lockedAmountKop;
    const custom = customAmount.trim();
    if (!custom) return 0;
    const n = parseFloat(custom.replace(",", "."));
    return !isNaN(n) && n > 0 ? toKopecks(n) : 0;
  }, [lockedAmountKop, customAmount]);

  const handlePay = async () => {
    const kop = amountKop();
    if (kop < PAYMENT_MIN_AMOUNT_KOP) {
      setResultError(PAY_MSG_MIN_AMOUNT_RUB);
      setResult("fail");
      return;
    }
    if (kop > PAYMENT_MAX_AMOUNT_KOP) {
      setResultError(PAYMENT_MAX_ERROR);
      setResult("fail");
      return;
    }

    setPaying(true);
    setResult(null);
    setResultError(null);

    const idempotencyKey = `pay-${slug}-${crypto.randomUUID()}`;
    let leaveForPaygine = false;

    const commentTrim = comment.trim();
    const combinedComment =
      tipRating > 0 && commentTrim
        ? `Оценка: ${tipRating}/5\n${commentTrim}`
        : tipRating > 0
          ? `Оценка: ${tipRating}/5`
          : commentTrim || undefined;

    try {
      const res = await fetch(`/api/pay/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({
          amountKop: kop,
          comment: combinedComment,
          idempotencyKey,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        redirectUrl?: string;
        redirectToken?: string;
        transactionId?: string;
      };

      if (!res.ok) {
        setResultError(data.error ?? PAY_MSG_PAYMENT_GENERIC_ERROR);
        setResult("fail");
        return;
      }

      const redirectUrl = typeof data.redirectUrl === "string" ? data.redirectUrl.trim() : "";
      const redirectToken = typeof data.redirectToken === "string" ? data.redirectToken.trim() : "";
      const transactionId = typeof data.transactionId === "string" ? data.transactionId.trim() : "";

      if (redirectUrl && redirectToken && transactionId) {
        leaveForPaygine = true;
        postPayRedirectProxy(transactionId, redirectToken);
        return;
      }

      if (redirectUrl) {
        leaveForPaygine = true;
        window.location.assign(redirectUrl);
        return;
      }

      setResult(data.success ? "success" : "fail");
      if (!data.success) setResultError(PAY_MSG_PAYMENT_DECLINED);
    } catch {
      setResultError(CLIENT_MSG_CONNECTION_ERROR);
      setResult("fail");
    } finally {
      if (!leaveForPaygine) setPaying(false);
    }
  };

  const payReturnFail = urlOutcome === "fail" || (urlOutcome === "success" && settlementPhase === "fail");

  const m5c = payM5Shell ? " pay-page--m5-competition" : "";
  const m5SuccessCard = payM5Shell ? " pay-success-card--m5" : "";

  if (tidFromUrl && urlOutcome && payReturnFail) {
    return (
      <div className={`pay-page${m5c} ${PAY_SUCCESS_FLOW_OUTER}`}>
        <div className={`pay-success-card${m5SuccessCard} ${PAY_SUCCESS_CARD_GEOMETRY}`}>
          <div className={PAY_RESULT_ICON_ERROR}>
            <XCircle className="h-9 w-9 text-[var(--color-accent-red)]" />
          </div>
          <div className="mt-8 flex flex-col items-center text-center">
            <h1 className={PAY_RESULT_TITLE}>Оплата не прошла</h1>
            <p className={PAY_RESULT_SUBTITLE_MUTED}>
              Платёж был отклонён или отменён. Вы можете попробовать снова.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={slug ? `/pay/${slug}` : "/"}
              className="pay-m5-cta-secondary rounded-xl border border-[#0a192f]/35 bg-transparent px-5 py-2.5 text-center text-sm font-medium text-[#0a192f] hover:bg-[#0a192f]/8"
            >
              Попробовать снова
            </Link>
            <Link
              href="/"
              className="pay-m5-cta-primary rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90"
            >
              На главную
            </Link>
          </div>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  if (tidFromUrl && urlOutcome === "success" && settlementPhase === "verifying") {
    return (
      <div className={`pay-page${m5c} ${PAY_SUCCESS_FLOW_OUTER}`}>
        <div className={`pay-success-card${m5SuccessCard} ${PAY_SUCCESS_CARD_GEOMETRY}`}>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[var(--color-accent-emerald)]" aria-hidden />
          <p className="mt-6 text-center text-lg font-medium text-[#0a192f]">Подтверждаем зачисление…</p>
          <p className="mt-2 text-center text-sm text-[#2d3748]">
            Платёж прошёл, дождитесь подтверждения — обычно это несколько секунд.
          </p>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  if (tidFromUrl && urlOutcome === "success" && settlementPhase === "slow") {
    return (
      <div className={`pay-page${m5c} ${PAY_SUCCESS_FLOW_OUTER}`}>
        <div className={`pay-success-card${m5SuccessCard} ${PAY_SUCCESS_CARD_GEOMETRY}`}>
          <div className={PAY_RESULT_ICON_PENDING}>
            <Loader2 className="h-9 w-9 text-amber-600 animate-spin" aria-hidden />
          </div>
          <div className="mt-8 flex flex-col items-center text-center">
            <h1 className={PAY_RESULT_TITLE}>Платёж принят</h1>
            <p className={PAY_RESULT_SUBTITLE_MUTED}>
              Банк подтвердил оплату. Зачисление на баланс получателя может занять несколько минут — это нормально.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="pay-m5-cta-primary rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90"
            >
              На главную
            </Link>
          </div>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  const successRecipientLabel = (recipientName?.trim() || "Получатель") as string;

  if (tidFromUrl && urlOutcome === "success" && settlementPhase === "success") {
    return (
      <div className={`pay-page${m5c} ${PAY_SUCCESS_FLOW_OUTER}`}>
        <div className={`pay-success-card${m5SuccessCard} ${PAY_SUCCESS_CARD_GEOMETRY}`}>
          <div className={PAY_RESULT_ICON_SUCCESS}>
            <CheckCircle2 className="h-9 w-9 text-[var(--color-accent-emerald)]" />
          </div>
          <div className="mt-8 flex flex-col items-center text-center">
            <h1 className={PAY_RESULT_TITLE}>Спасибо!</h1>
            <p className="mt-1 text-center text-lg font-medium text-[#0a192f]">Чаевые зачислены.</p>
            <p className={PAY_RESULT_SUBTITLE_MUTED}>{successRecipientLabel} получил вашу благодарность.</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setResultError(null);
                setCustomAmount("");
                setComment("");
                setTipRating(0);
                if (slug) router.replace(`/pay/${slug}`);
              }}
              className="pay-m5-cta-secondary rounded-xl border border-[#0a192f]/35 bg-transparent px-5 py-2.5 text-sm font-medium text-[#0a192f] hover:bg-[#0a192f]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a192f]/25"
            >
              Отправить ещё
            </button>
            <Link
              href="/"
              className="pay-m5-cta-primary rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
            >
              На главную
            </Link>
          </div>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`pay-page pay-page--cards${m5c} w-full`}>
        <div className={PAY_PAGE_CENTERED_NARROW}>
          <LoadingSpinner message="Загрузка…" className="min-h-[60vh]" />
        </div>
      </div>
    );
  }

  if (error || !recipientName) {
    return (
      <div className={`pay-page pay-page--cards${m5c} ${PAY_PAGE_FATAL_WRAP}`}>
        <XCircle className="h-14 w-14 text-[var(--color-text-secondary)]" />
        <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">{error ?? PAY_MSG_LINK_NOT_FOUND}</h1>
        <Link href="/" className={PAY_PAGE_FATAL_HOME_LINK}>
          На главную
        </Link>
      </div>
    );
  }

  if (result === "success") {
    return (
      <div className={`pay-page${m5c} ${PAY_SUCCESS_FLOW_OUTER}`}>
        <div className={`pay-success-card${m5SuccessCard} ${PAY_SUCCESS_CARD_GEOMETRY}`}>
          <div className={PAY_RESULT_ICON_SUCCESS}>
            <CheckCircle2 className="h-9 w-9 text-[var(--color-accent-emerald)]" />
          </div>
          <div className="mt-8 flex flex-col items-center text-center">
            <h1 className={PAY_RESULT_TITLE}>Спасибо!</h1>
            <p className="mt-1 text-center text-lg font-medium text-[#0a192f]">Чаевые зачислены.</p>
            <p className={PAY_RESULT_SUBTITLE_MUTED}>
              {(recipientName ?? "Получатель")} получил вашу благодарность.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setResultError(null);
                setCustomAmount("");
                setComment("");
                setTipRating(0);
                if (slug) router.replace(`/pay/${slug}`);
              }}
              className="pay-m5-cta-secondary rounded-xl border border-[#0a192f]/35 bg-transparent px-5 py-2.5 text-sm font-medium text-[#0a192f] hover:bg-[#0a192f]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a192f]/25"
            >
              Отправить ещё
            </button>
            <Link
              href="/"
              className="pay-m5-cta-primary rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
            >
              На главную
            </Link>
          </div>
        </div>
        <PayTelegramSupportBlock variant="result" className="mt-5 w-full max-w-sm shrink-0" />
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
    <div
      className={`pay-page pay-page--cards flex min-h-screen w-full flex-col px-4 ${payM5Shell ? "justify-center py-8" : "justify-start"}${m5c}${!payM5Shell ? " pay-page--netmonet" : ""}`}
      style={wrapperStyle}
    >
      <div className={`mx-auto w-full ${payM5Shell ? "max-w-md" : "max-w-xl"}`}>
        {payM5Shell ? (
          <>
        {/* Основной блок со скруглёнными краями и отступами — внутри все карточки */}
        <div
          className="pay-page-outer-block rounded-2xl border-0 px-4 pt-5 pb-5 shadow-[var(--shadow-card)]"
        style={Object.keys(cardStyle).length ? cardStyle : undefined}
      >
        {/* Центр логотипа — середина блока; тема — в правой колонке (сетка 1fr / auto / 1fr) */}
        <div className="pay-page-header-row mb-7 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-3">
          <span className="min-w-0" aria-hidden />
          <div className="pay-page-logo-wrap flex justify-center">
            {branding?.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt=""
                width={120}
                height={40}
                unoptimized
                className="h-10 w-auto max-w-[120px] object-contain"
                style={{ opacity: branding?.logoOpacityPercent != null ? branding.logoOpacityPercent / 100 : 1 }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="pay-page-logo-ft logo-ft-abbr flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-gold)] text-sm text-[#0a192f]">
                  FT
                </span>
                <span className="font-[family:var(--font-playfair)] text-lg font-bold pay-page-logo-text">
                  <span className="pay-page-logo-free">Free</span>
                  <span className="pay-page-logo-tips text-[var(--color-brand-gold)]">Tips</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex min-w-0 justify-end self-center">
            <ThemeToggle variant={payM5Shell ? "m5" : "default"} compact />
          </div>
        </div>

        {/* Карточка: получатель — обводка до QR, отступ от QR как слева от блока */}
        <div className="pay-page-card card pay-page-recipient-card" style={Object.keys(cardStyle).length ? cardStyle : undefined}>
          <div className="pay-page-recipient pay-page-recipient--with-qr">
            <div className="pay-page-recipient-bordered">
              <div className="pay-page-recipient-profile">
                {recipientPhotoUrl ? (
                  <Image
                    src={recipientPhotoUrl}
                    alt=""
                    width={56}
                    height={56}
                    unoptimized
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
                <Image
                  src={qrDataUrl}
                  alt="QR страницы"
                  width={64}
                  height={64}
                  unoptimized
                  className="rounded-lg bg-[var(--pay-page-card-bg)] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                />
              </div>
            )}
          </div>
        </div>

        {!acceptPayments && (
          <div className="pay-page-unavailable-alert pay-page-card card" role="alert">
            <p className="pay-page-section-title pay-page-unavailable-alert-title">Приём временно недоступен</p>
            <p className="pay-page-unavailable-alert-body mt-2 text-center text-sm">
              {paymentUnavailableReason ??
                "Перевод по этой ссылке сейчас отключён администратором. Страница открывается, но оплату отправить нельзя — попробуйте позже."}
            </p>
          </div>
        )}

        {/* Блок только с целью: на что копит официант */}
        <div className="pay-page-saving-goal pay-page-card card" style={Object.keys(cardStyle).length ? cardStyle : undefined}>
          <p className="pay-page-saving-goal-text" style={{ color: fontClr ?? undefined }} title={savingFor?.trim() ? `Коплю на: ${savingFor}` : undefined}>
            {savingFor?.trim() ? `Коплю на: ${savingFor}` : "Коплю на большое счастье"}
          </p>
        </div>

        {/* Карточка: сумма чаевых */}
        <div className="pay-page-card card" style={Object.keys(cardStyle).length ? cardStyle : undefined}>
          {lockedAmountKop != null ? (
            <>
              <p className="pay-page-section-title text-center">Сумма чаевых</p>
              <p className="pay-page-locked-amount-value text-center tabular-nums">
                {rub.toFixed(rub % 1 === 0 ? 0 : 2)} ₽
              </p>
            </>
          ) : (
            <>
              <p className="pay-page-section-title text-center">Сумма чаевых</p>
              <p className="pay-page-label pay-page-label-with-arrow">
                <span className="pay-page-label-hint-text">
                  Введите свою сумму в форму{" "}
                  <span className="pay-page-label-niche-with-arrow">
                    ниже
                    <ChevronDown className="pay-page-label-arrow" aria-hidden strokeWidth={2.5} />
                  </span>
                </span>
              </p>
              <div className="pay-page-input-wrap custom-amount pay-page-custom-amount-row">
                <span className="pay-page-amount-prefix" aria-hidden>
                  ₽&nbsp;=
                </span>
                <input
                  id="pay-custom-amount-rub"
                  name="customAmountRub"
                  type="text"
                  inputMode="decimal"
                  placeholder="Введите свою сумму"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  disabled={!acceptPayments}
                  autoComplete="off"
                  aria-label="Сумма в рублях, не больше 1 000"
                />
              </div>
              {kop > PAYMENT_MAX_AMOUNT_KOP && <PayInlineError>{PAYMENT_MAX_ERROR}</PayInlineError>}
            </>
          )}
        </div>

        {/* Карточка: отзыв */}
        <div
          className="pay-page-card pay-page-card--review card"
          style={Object.keys(cardStyle).length ? cardStyle : undefined}
        >
          <p className="pay-page-section-title">Отзыв (необязательно)</p>
          <div className="pay-page-input-wrap">
            <textarea
              id="pay-review-comment"
              name="reviewComment"
              className="review-textarea"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              disabled={!acceptPayments}
              placeholder="Спасибо за отличный сервис!"
              autoComplete="off"
              aria-label="Отзыв"
            />
          </div>
        </div>

        {result === "fail" && resultError && <PayInlineError>{resultError}</PayInlineError>}

        <div className="pay-page-pay-footer flex flex-col gap-3">
          <PayTelegramSupportBlock />
          <button
            type="button"
            onClick={handlePay}
            disabled={!acceptPayments || paying || kop < PAYMENT_MIN_AMOUNT_KOP || kop > PAYMENT_MAX_AMOUNT_KOP}
            className="pay-button pay-page-submit"
          >
            {paying ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Отправка…
              </span>
            ) : (
              "Оплатить картой"
            )}
          </button>
        </div>
      </div>
          </>
        ) : (
          <>
            <header className="mb-10 flex items-center justify-center">
              <div className="min-w-0 shrink">
                {branding?.logoUrl ? (
                  <Image
                    src={branding.logoUrl}
                    alt=""
                    width={120}
                    height={36}
                    unoptimized
                    className="h-9 w-auto max-w-[140px] object-contain"
                    style={{ opacity: branding?.logoOpacityPercent != null ? branding.logoOpacityPercent / 100 : 1 }}
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="pay-page-logo-ft logo-ft-abbr flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-gold)] text-sm text-[#0a192f]">
                      FT
                    </span>
                    <span className="font-[family:var(--font-playfair)] text-lg font-bold text-[var(--color-text)]">
                      <span className="opacity-95">Free</span>
                      <span className="text-[var(--color-brand-gold)]">Tips</span>
                    </span>
                  </div>
                )}
              </div>
            </header>

            <div className="mb-4 flex flex-col items-center gap-y-16 text-center">
              <div
                className={`relative shrink-0 rounded-full p-0.5 ${recipientPhotoUrl ? "ring-2 ring-[var(--color-brand-gold)] ring-offset-1 ring-offset-[var(--color-bg)]" : "ring-2 ring-[var(--color-brand-gold)]/80 ring-offset-1 ring-offset-[var(--color-bg)]"}`}
              >
                {recipientPhotoUrl ? (
                  <Image
                    src={recipientPhotoUrl}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-sides)] text-[var(--color-brand-gold)]">
                    <User className="h-8 w-8" aria-hidden />
                  </div>
                )}
              </div>
              <h2 className="text-lg font-bold leading-tight text-[var(--color-text)] antialiased" style={{ color: fontClr ?? undefined }}>
                {recipientName}
              </h2>
            </div>

            {!acceptPayments && (
              <div className="pay-page-unavailable-alert pay-page-card card mb-4" role="alert">
                <p className="pay-page-section-title pay-page-unavailable-alert-title">Приём временно недоступен</p>
                <p className="pay-page-unavailable-alert-body mt-2 text-center text-sm">
                  {paymentUnavailableReason ??
                    "Перевод по этой ссылке сейчас отключён администратором. Страница открывается, но оплату отправить нельзя — попробуйте позже."}
                </p>
              </div>
            )}

            <p className="pay-page-netmonet-saving-goal mb-2 text-center text-[var(--color-text-secondary)]">
              {savingFor?.trim() ? `Коплю на: ${savingFor}` : "Коплю на большое счастье"}
            </p>

            <section
              className="pay-page-netmonet-sheet rounded-2xl px-3 pb-3 pt-3 shadow-[var(--shadow-card)] sm:px-4 sm:pb-4 sm:pt-4"
              style={Object.keys(cardStyle).length ? cardStyle : undefined}
            >
              <p className="mb-2 text-center text-xs font-medium text-[var(--color-muted)]">
                {lockedAmountKop != null ? "Сумма по ссылке" : "Сумма чаевых"}
              </p>

              {lockedAmountKop != null ? (
                <p className="pay-page-netmonet-amount-readonly text-center tabular-nums text-[var(--color-text)]">
                  {rub.toFixed(rub % 1 === 0 ? 0 : 2)}{" "}
                  <span className="text-[0.65em] font-semibold opacity-90">₽</span>
                </p>
              ) : (
                <div className="mx-auto w-full max-w-[min(100%,360px)]">
                  <div className="flex min-h-[2rem] items-end justify-center border-b-2 border-[var(--color-brand-gold)] pb-0.5">
                    <div className="flex min-w-0 max-w-full items-end justify-center gap-1">
                      <input
                        id="pay-custom-amount-rub"
                        name="customAmountRub"
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        disabled={!acceptPayments}
                        autoComplete="off"
                        aria-label="Сумма чаевых в рублях, от 1 до 1000"
                        className="pay-page-netmonet-amount-input min-w-0 flex-1 bg-transparent text-center text-[var(--color-text)] placeholder:text-[var(--color-muted)]/55 disabled:opacity-50"
                      />
                      <div className="flex shrink-0 items-end gap-1.5 pb-0.5">
                        {customAmount.trim() !== "" && acceptPayments ? (
                          <button
                            type="button"
                            className="pay-page-netmonet-amount-clear mb-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-sm transition-colors"
                            onClick={() => setCustomAmount("")}
                            aria-label="Очистить сумму"
                          >
                            <X className="h-3 w-3" strokeWidth={2.5} />
                          </button>
                        ) : null}
                        <span className="text-lg font-semibold tabular-nums text-[var(--color-text)]">₽</span>
                      </div>
                    </div>
                  </div>
                  <p className="pay-page-netmonet-amount-hint mt-1.5 text-center font-normal leading-snug">
                    Выберите сумму или введите свою
                  </p>
                </div>
              )}

              {lockedAmountKop == null && kop > PAYMENT_MAX_AMOUNT_KOP ? (
                <div className="mt-3">
                  <PayInlineError>{PAYMENT_MAX_ERROR}</PayInlineError>
                </div>
              ) : null}

              <p className="pay-page-netmonet-rating-prompt mb-2 mt-6 text-center font-medium text-[var(--color-text)]">
                Вам всё понравилось?
              </p>
              <div className="pay-page-netmonet-stars flex flex-wrap justify-center gap-1" role="group" aria-label="Оценка">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={!acceptPayments}
                    className="rounded-md p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-muted)]/10 disabled:opacity-50"
                    aria-label={`Оценка ${n} из 5`}
                    aria-pressed={tipRating === n}
                    onClick={() => setTipRating(tipRating === n ? 0 : n)}
                  >
                    <Star
                      className={`h-7 w-7 ${n <= tipRating ? "fill-[var(--color-brand-gold)] text-[var(--color-brand-gold)]" : ""}`}
                      strokeWidth={n <= tipRating ? 0 : 1.5}
                    />
                  </button>
                ))}
              </div>

              <label htmlFor="pay-review-comment" className="mb-0.5 mt-3 block text-center text-xs text-[var(--color-muted)]">
                Сообщение (необязательно)
              </label>
              <textarea
                id="pay-review-comment"
                name="reviewComment"
                className="pay-page-netmonet-note"
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                disabled={!acceptPayments}
                placeholder="Спасибо за отличный сервис!"
                autoComplete="off"
              />

              <div className="pay-page-netmonet-support-wrap mt-3">
                <PayTelegramSupportBlock />
              </div>

              {result === "fail" && resultError ? (
                <div className="mt-3">
                  <PayInlineError>{resultError}</PayInlineError>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handlePay}
                disabled={!acceptPayments || paying || kop < PAYMENT_MIN_AMOUNT_KOP || kop > PAYMENT_MAX_AMOUNT_KOP}
                className="pay-button pay-page-submit mt-3 w-full"
              >
                {paying ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Отправка…
                  </span>
                ) : (
                  "Оплатить картой"
                )}
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
