"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, List, Key, Copy, RotateCw, Settings, ExternalLink, ShieldCheck, ShieldAlert, Download, Eye } from "lucide-react";
import { PremiumCard } from "./PremiumCard";
import { formatMoney } from "@/lib/utils";
import { getBaseUrl } from "@/lib/get-base-url";
import { isCabinetM5CompetitionTheme, m5SplitDisplayName } from "@/config/cabinet-theme-logins";
import { CabinetSkeleton } from "@/components/CabinetSkeleton";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";
import { Stats } from "./shared";

function cabinetLimitsFillClass(): string {
  return "h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300";
}

function cabinetLimitLabelTitle(pct: number, label: string): string | undefined {
  if (pct < 80) return undefined;
  if (pct >= 95) return `${label} — почти достигнут лимит`;
  return `${label} — приближаетесь к лимиту`;
}

const QUICK_ACTIONS = [
  { href: "/cabinet/link", icon: Link2, title: "Ссылка и QR", desc: "Скопировать ссылку для чаевых" },
  { href: "/cabinet/transactions", icon: List, title: "История операций и вывод средств", desc: "Все поступления, транзакции и вывод" },
  { href: "#api-key", icon: Key, title: "API ключ", desc: "Для интеграции с приложением" },
  { href: "/cabinet/settings", icon: Settings, title: "Настройки профиля", desc: "Редактировать данные и пароль" },
] as const;

export default function CabinetDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [revealKeyError, setRevealKeyError] = useState<string | null>(null);
  const [revealKeyLoading, setRevealKeyLoading] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const [login, setLogin] = useState<string | null>(null);
  const [uniqueId, setUniqueId] = useState<string | null>(null);
  const [payoutLimits, setPayoutLimits] = useState<{
    dailyLimitCount: number;
    dailyLimitKop: number;
    monthlyLimitCount?: number;
    monthlyLimitKop?: number;
  } | null>(null);
  const [payoutUsageToday, setPayoutUsageToday] = useState<{ count: number; sumKop: number } | null>(null);
  const [payoutUsageMonth, setPayoutUsageMonth] = useState<{ count: number; sumKop: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tipLink, setTipLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [savingForEdit, setSavingForEdit] = useState("");
  const [savingForSaving, setSavingForSaving] = useState(false);
  const [savingForEditing, setSavingForEditing] = useState(false);
  const goalTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = goalTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [savingForEdit]);

  const fetchProfileAndData = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const profileRes = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } });
      if (profileRes.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/login");
        return;
      }
      if (!profileRes.ok) {
        let msg = "Не удалось загрузить данные";
        try {
          const errBody = (await profileRes.json()) as { error?: string };
          if (errBody?.error) msg += `: ${errBody.error}`;
          else msg += ` (код ${profileRes.status})`;
        } catch {
          msg += ` (код ${profileRes.status})`;
        }
        setError(msg);
        return;
      }
      const profile = (await profileRes.json()) as {
        login?: string;
        stats?: Stats;
        hasApiKey?: boolean;
        fullName?: string | null;
        uniqueId?: string | null;
        savingFor?: string | null;
        payoutLimits?: { dailyLimitCount: number; dailyLimitKop: number; monthlyLimitCount?: number; monthlyLimitKop?: number };
        payoutUsageToday?: { count: number; sumKop: number };
        payoutUsageMonth?: { count: number; sumKop: number };
        verificationStatus?: string;
      };
      setStats(profile.stats ?? null);
      setHasApiKey(profile.hasApiKey ?? false);
      setApiKey(null);
      setLogin(profile.login ?? null);
      setFullName(profile.fullName ?? null);
      setUniqueId(profile.uniqueId ?? null);
      setSavingFor(profile.savingFor ?? null);
      setPayoutLimits(profile.payoutLimits ?? null);
      setPayoutUsageToday(profile.payoutUsageToday ?? null);
      setPayoutUsageMonth(profile.payoutUsageMonth ?? null);
      setVerificationStatus(profile.verificationStatus ?? null);
      const linksRes = await fetch("/api/links", { headers: { Authorization: `Bearer ${token}` } });
      if (linksRes.ok) {
        const linksData = (await linksRes.json()) as { links: { slug: string }[] };
        if (linksData.links?.length > 0) {
          setTipLink(`${getBaseUrl()}/pay/${linksData.links[0].slug}`);
        }
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchProfileAndData();
  }, [router, fetchProfileAndData]);

  useEffect(() => {
    setSavingForEdit(savingFor ?? "");
  }, [savingFor]);

  // Обновление баланса при возврате на вкладку (после зачислений/списаний)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && localStorage.getItem("accessToken")) {
        fetchProfileAndData();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchProfileAndData]);

  const copyTipLink = useCallback(async () => {
    if (!tipLink) return;
    try {
      await navigator.clipboard.writeText(tipLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [tipLink]);

  const saveSavingFor = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    const value = savingForEdit.trim() || null;
    if (value === (savingFor ?? null)) return;
    setSavingForSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ savingFor: value ?? "" }),
      });
      if (res.ok) {
        setSavingFor(value);
        setSavingForEditing(false);
      }
    } finally {
      setSavingForSaving(false);
    }
  }, [savingForEdit, savingFor]);

  const copyApiKey = useCallback(() => {
    if (!apiKey) return;
    void navigator.clipboard.writeText(apiKey).then(() => {
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2500);
    });
  }, [apiKey]);

  const regenerateApiKey = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setRevealKeyError(null);
    setApiKeyLoading(true);
    try {
      const res = await fetch("/api/profile/api-key", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { apiKey: string };
        setApiKey(data.apiKey);
        setHasApiKey(true);
      }
    } finally {
      setApiKeyLoading(false);
    }
  }, []);

  const revealApiKey = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setRevealKeyError(null);
    setRevealKeyLoading(true);
    try {
      const res = await fetch("/api/profile/api-key", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { apiKey: string };
        setApiKey(data.apiKey);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setRevealKeyError(body?.error ?? "Не удалось получить ключ");
    } finally {
      setRevealKeyLoading(false);
    }
  }, []);

  if (loading) {
    return <CabinetSkeleton />;
  }

  const isM5Cabinet = isCabinetM5CompetitionTheme(login);

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`mt-4 ${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px]`}
        >
          Повторить
        </button>
      </div>
    );
  }
  const dashName = fullName?.trim() || "Официант";
  const m5DashName = isM5Cabinet ? m5SplitDisplayName(dashName) : null;

  const m5BtnNavLike =
    "cabinet-m5-btn-nav-like inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-[14px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const m5BtnPairRed =
    "cabinet-m5-btn-pair-red inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-[14px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const m5BtnPairBlue =
    "cabinet-m5-btn-pair-blue inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-[14px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const m5BtnNavLikeWide =
    "cabinet-m5-btn-nav-like inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-[14px] font-semibold transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const limitPcts =
    payoutLimits != null
      ? {
          dayCount:
            payoutLimits.dailyLimitCount > 0
              ? Math.min(100, ((payoutUsageToday?.count ?? 0) / payoutLimits.dailyLimitCount) * 100)
              : 0,
          daySum:
            payoutLimits.dailyLimitKop > 0
              ? Math.min(100, (Number(payoutUsageToday?.sumKop ?? 0) / payoutLimits.dailyLimitKop) * 100)
              : 0,
          monthCount:
            typeof payoutLimits.monthlyLimitCount === "number" && payoutLimits.monthlyLimitCount > 0
              ? Math.min(100, ((payoutUsageMonth?.count ?? 0) / payoutLimits.monthlyLimitCount) * 100)
              : 0,
          monthSum:
            typeof payoutLimits.monthlyLimitKop === "number" && payoutLimits.monthlyLimitKop > 0
              ? Math.min(100, (Number(payoutUsageMonth?.sumKop ?? 0) / payoutLimits.monthlyLimitKop) * 100)
              : 0,
        }
      : null;

  return (
    <div className="space-y-8">
      <div className="cabinet-dashboard-hero-grid grid min-w-0 grid-cols-1 gap-6 lg:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:items-stretch">
        <div className="cabinet-card flex min-h-0 min-w-0 flex-col rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden lg:h-full">
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <div className="flex flex-col items-center gap-10">
              <div
                className={`cabinet-dashboard-name-hero w-full min-w-0 px-0 ${isM5Cabinet ? "cabinet-dashboard-name-hero--m5" : ""}`}
              >
                <div className="cabinet-dashboard-name-hero__pill">
                  <p
                    className={`cabinet-dashboard-name-hero__text ${isM5Cabinet ? "cabinet-dashboard-name-hero__text--m5" : ""}`}
                  >
                    {m5DashName ? (
                      m5DashName.rest != null ? (
                        <>
                          <span className="text-[#8ec5ff]">{m5DashName.first}</span>{" "}
                          <span className="text-[#e5252a]">{m5DashName.rest}</span>
                        </>
                      ) : (
                        <span className="text-[#8ec5ff]">{m5DashName.first}</span>
                      )
                    ) : (
                      dashName
                    )}
                  </p>
                </div>
              </div>
              <div className="cabinet-dashboard-balance-wrap flex w-full max-w-[320px] shrink-0 flex-col items-center justify-center overflow-visible">
                <PremiumCard
                  fullName={fullName}
                  uniqueId={uniqueId}
                  balanceKop={stats?.balanceKop ?? undefined}
                  compact
                  variant={isM5Cabinet ? "m5" : "default"}
                />
              </div>
            </div>

            {verificationStatus && (
              <div
                className="cabinet-limits-block cabinet-verification-status mt-6 w-full min-w-0 max-w-full rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-5 flex flex-col items-center text-center"
                data-verification-state={
                  verificationStatus === "VERIFIED"
                    ? "verified"
                    : verificationStatus === "PENDING"
                      ? "pending"
                      : "required"
                }
              >
                {verificationStatus === "VERIFIED" ? (
                  <div className="flex w-full min-w-0 max-w-full flex-col items-center justify-center gap-3 px-1 text-center">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600/20 text-green-500"
                      aria-hidden={true}
                    >
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <p className="mb-0 text-center text-base font-semibold leading-snug text-white">Аккаунт верифицирован!</p>
                    <p className="mb-0 max-w-sm text-center text-sm leading-relaxed text-white">Ваша личность подтверждена.</p>
                  </div>
                ) : verificationStatus === "PENDING" ? (
                  <div className="flex items-center justify-center gap-3 text-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Заявка на рассмотрении</p>
                      <p className="text-sm text-white/90">Ожидайте результата проверки документов.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <p className="mb-2 font-semibold text-white">Уважаемый клиент,</p>
                    <p className="mb-3 text-sm text-white/90">
                      Чтобы пользоваться услугами сервиса, вам необходимо пройти верификацию.
                    </p>
                    <Link
                      href="/cabinet/verification"
                      className={
                        isM5Cabinet
                          ? `${m5BtnNavLike} text-sm`
                          : `${CABINET_WAITER_BTN_INLINE} px-4 py-2 text-sm`
                      }
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Пройти верификацию
                    </Link>
                  </div>
                )}
              </div>
            )}

            {payoutLimits && (
              <div className="cabinet-limits-block mt-6 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-5">
                <h4 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Доступные лимиты</h4>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span
                        className="cabinet-limits-label text-[var(--color-text-secondary)]"
                        title={cabinetLimitLabelTitle(limitPcts?.dayCount ?? 0, "Заявок в сутки")}
                      >
                        Заявок в сутки
                      </span>
                      <span className="font-medium text-[var(--color-text)]">
                        {payoutUsageToday?.count ?? 0} из {payoutLimits.dailyLimitCount}
                      </span>
                    </div>
                    <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                      <div
                        className={cabinetLimitsFillClass()}
                        style={{
                          width: `${Math.min(100, ((payoutUsageToday?.count ?? 0) / payoutLimits.dailyLimitCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span
                        className="cabinet-limits-label text-[var(--color-text-secondary)]"
                        title={cabinetLimitLabelTitle(limitPcts?.daySum ?? 0, "Сумма в сутки")}
                      >
                        Сумма в сутки
                      </span>
                      <span className="font-medium text-[var(--color-text)]">
                        {formatMoney(BigInt(payoutUsageToday?.sumKop ?? 0))} из {formatMoney(BigInt(payoutLimits.dailyLimitKop))}
                      </span>
                    </div>
                    <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                      <div
                        className={cabinetLimitsFillClass()}
                        style={{
                          width: `${Math.min(100, payoutLimits.dailyLimitKop > 0 ? (Number(payoutUsageToday?.sumKop ?? 0) / payoutLimits.dailyLimitKop) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  {typeof payoutLimits.monthlyLimitCount === "number" && typeof payoutLimits.monthlyLimitKop === "number" && (
                    <>
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span
                            className="cabinet-limits-label text-[var(--color-text-secondary)]"
                            title={cabinetLimitLabelTitle(limitPcts?.monthCount ?? 0, "Заявок в месяц")}
                          >
                            Заявок в месяц
                          </span>
                          <span className="font-medium text-[var(--color-text)]">
                            {payoutUsageMonth?.count ?? 0} из {payoutLimits.monthlyLimitCount}
                          </span>
                        </div>
                        <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                          <div
                            className={cabinetLimitsFillClass()}
                            style={{
                              width: `${Math.min(100, payoutLimits.monthlyLimitCount > 0 ? ((payoutUsageMonth?.count ?? 0) / payoutLimits.monthlyLimitCount) * 100 : 0)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span
                            className="cabinet-limits-label text-[var(--color-text-secondary)]"
                            title={cabinetLimitLabelTitle(limitPcts?.monthSum ?? 0, "Сумма в месяц")}
                          >
                            Сумма в месяц
                          </span>
                          <span className="font-medium text-[var(--color-text)]">
                            {formatMoney(BigInt(payoutUsageMonth?.sumKop ?? 0))} из {formatMoney(BigInt(payoutLimits.monthlyLimitKop))}
                          </span>
                        </div>
                        <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                          <div
                            className={cabinetLimitsFillClass()}
                            style={{
                              width: `${Math.min(100, payoutLimits.monthlyLimitKop > 0 ? (Number(payoutUsageMonth?.sumKop ?? 0) / payoutLimits.monthlyLimitKop) * 100 : 0)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div id="quick-actions" className="cabinet-card flex min-h-0 min-w-0 flex-col rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden lg:h-full">
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <h3 className="cabinet-dashboard-card-title mb-3 text-center font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)]">
              Быстрые действия
            </h3>
            {/* 1. Your link for tea — сверху */}
            {tipLink && (
              <div className="cabinet-block-inner mb-6 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-4">
                <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">
                  Ваша ссылка для чаевых
                </div>
                <div className="cabinet-input-window mb-3 min-w-0 max-w-full break-all rounded-lg bg-[var(--color-bg-sides)] px-3 py-2 font-mono text-xs text-[var(--color-text)]/90">
                  {tipLink}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={copyTipLink}
                    className={
                      isM5Cabinet
                        ? m5BtnPairRed
                        : `${CABINET_WAITER_BTN_INLINE} px-4 py-2 text-[14px]`
                    }
                  >
                    <Copy className="h-4 w-4" />
                    {linkCopied ? "Скопировано!" : "Копировать ссылку"}
                  </button>
                  <a
                    href={tipLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      isM5Cabinet
                        ? `cabinet-card-btn-link ${m5BtnPairBlue}`
                        : `cabinet-card-btn-link ${CABINET_WAITER_BTN_INLINE} px-4 py-2 text-[14px]`
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                    Перейти по ссылке
                  </a>
                </div>
              </div>
            )}

            {/* 2. Four quick action cards */}
            <div className="mb-6 grid min-w-0 grid-cols-2 gap-4">
              {QUICK_ACTIONS.map(({ href, icon: Icon, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="cabinet-block-inner flex min-w-0 flex-col items-center rounded-[10px] border border-[rgba(197,165,114,0.55)] bg-[var(--color-dark-gray)]/10 p-6 shadow-[var(--shadow-subtle)] transition-all hover:bg-[rgba(197,165,114,0.12)] hover:-translate-y-1"
                >
                  <div className="cabinet-quick-action-icon mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-gold)] text-[#0a192f]">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="font-semibold text-[var(--color-text)] text-center">
                    {title}
                  </div>
                  <div className="mt-1 text-center text-sm text-[var(--color-text)]/90">
                    {desc}
                  </div>
                </Link>
              ))}
            </div>

            {/* 3. Goal card — внизу, с фоном, заголовок и контент по центру */}
            <div className="cabinet-goal-card cabinet-block-inner flex flex-col items-center rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/20 p-5 shadow-[var(--shadow-subtle)]">
              <div className="mb-4 w-full text-center text-base font-semibold text-[var(--color-text)]">
                Укажите цель, на которую собираете 🎯
              </div>
              {savingFor && !savingForEditing ? (
                <div className="flex flex-col items-center text-center">
                  <div className="cabinet-goal-display mb-3 w-max max-w-full rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-3 text-center">
                    <p className="text-[14px] font-medium text-[var(--color-text)]">{savingFor}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSavingForEditing(true);
                      setSavingForEdit(savingFor);
                    }}
                    className={`${CABINET_WAITER_BTN_INLINE} px-4 py-2 text-[14px]`}
                  >
                    Изменить
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="cabinet-goal-input cabinet-input-window mb-3 w-max min-w-[200px] max-w-full rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-center text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text)]/50 focus-within:ring-2 focus-within:ring-[var(--color-brand-gold)]/50 focus-within:outline-none">
                    <textarea
                      ref={goalTextareaRef}
                      value={savingForEdit}
                      onChange={(e) => setSavingForEdit(e.target.value)}
                      placeholder="Например: новый ноутбук, отпуск…"
                      maxLength={500}
                      rows={1}
                      className="cabinet-goal-textarea w-full min-w-[16ch] max-w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-center align-baseline focus:outline-none focus:ring-0"
                      aria-label="Цель (на что коплю)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveSavingFor}
                    disabled={savingForSaving || (savingForEdit.trim() || null) === (savingFor ?? null)}
                    className={
                      isM5Cabinet
                        ? `${m5BtnNavLike} disabled:opacity-50 disabled:cursor-not-allowed`
                        : `${CABINET_WAITER_BTN_INLINE} px-4 py-2 text-[14px] disabled:cursor-not-allowed`
                    }
                  >
                    {savingForSaving ? "Сохранение…" : "Сохранить"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="api-key" className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="border-0 px-6 py-4">
          <h3 className="font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)]">
            API для уведомлений
          </h3>
        </div>
        <div className="p-6">
          <p className="mb-4 text-[var(--color-text)]/90">
            Скопируйте ключ и введите его в приложении FreeTips — и управляйте личным кабинетом официанта из мобильного приложения. (только для Android)
          </p>
          <p className="mb-6 flex flex-wrap items-center gap-3">
            <span className="text-white">Приложение для Android:</span>
            <a
              href={`${getBaseUrl()}/freetips.apk`}
              download="freetips.apk"
              className={
                isM5Cabinet
                  ? m5BtnNavLikeWide
                  : `${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px] focus:outline-none`
              }
            >
              <Download className="h-4 w-4 shrink-0" />
              Скачать приложение (APK)
            </a>
          </p>
          <div className="cabinet-block-inner rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/6 p-5">
            <div className="mb-4 text-sm font-semibold text-[var(--color-text)]">Ваш API ключ</div>
            <div className="cabinet-input-window cabinet-block-inner mb-4 break-all rounded-md border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-3 font-mono text-sm text-[var(--color-text-secondary)]">
              {apiKey ?? (hasApiKey ? "••••••••••••••••" : "Ключ не создан")}
            </div>
            {hasApiKey && !apiKey && (
              <p className="mb-4 text-xs text-[var(--color-muted)]">
                Ключ скрыт для безопасности. Нажмите «Показать ключ», если он доступен, либо «Создать новый ключ» — затем сразу скопируйте ключ в приложение. Старый ключ перестанет работать.
              </p>
            )}
            {apiKey && (
              <p className="mb-4 text-xs text-[var(--color-muted)]">
                Скопируйте ключ сейчас и вставьте в приложение — после обновления страницы он будет скрыт.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {apiKey ? (
                <>
                  <button
                    type="button"
                    onClick={copyApiKey}
                    className={
                      isM5Cabinet
                        ? `${m5BtnPairRed} px-5 py-2.5 focus:outline-none`
                        : `${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px] focus:outline-none`
                    }
                  >
                    <Copy className="h-4 w-4 shrink-0" />
                    {apiKeyCopied ? "Скопировано" : "Копировать"}
                  </button>
                  <button
                    type="button"
                    onClick={regenerateApiKey}
                    disabled={apiKeyLoading}
                    className={
                      isM5Cabinet
                        ? `${m5BtnPairBlue} px-5 py-2.5`
                        : `${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px]`
                    }
                  >
                    <RotateCw className="h-4 w-4" />
                    {apiKeyLoading ? "Создаём…" : "Создать новый ключ"}
                  </button>
                </>
              ) : hasApiKey ? (
                <div className="flex w-full flex-col gap-2">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={revealApiKey}
                      disabled={apiKeyLoading || revealKeyLoading}
                      className={
                        isM5Cabinet
                          ? `${m5BtnNavLikeWide} disabled:opacity-50 disabled:cursor-not-allowed`
                          : `${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px] disabled:cursor-not-allowed`
                      }
                    >
                      <Eye className="h-4 w-4 shrink-0" />
                      {revealKeyLoading ? "Загрузка…" : "Показать ключ"}
                    </button>
                    <button
                      type="button"
                      onClick={regenerateApiKey}
                      disabled={apiKeyLoading || revealKeyLoading}
                      className={
                        isM5Cabinet
                          ? `${m5BtnNavLikeWide} disabled:opacity-50 disabled:cursor-not-allowed`
                          : `${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px] disabled:cursor-not-allowed`
                      }
                    >
                      <Key className="h-4 w-4 shrink-0" />
                      {apiKeyLoading ? "Создаём…" : "Создать новый ключ"}
                    </button>
                  </div>
                  {revealKeyError && (
                    <p className="text-xs text-amber-200/95" role="alert">
                      {revealKeyError}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={regenerateApiKey}
                  disabled={apiKeyLoading}
                  className={
                    isM5Cabinet
                      ? m5BtnNavLikeWide
                      : `${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px]`
                  }
                >
                  <Key className="h-4 w-4" />
                  {apiKeyLoading ? "Создаём…" : "Создать ключ"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
