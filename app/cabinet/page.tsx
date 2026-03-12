"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, List, Key, Copy, RotateCw, Settings, ExternalLink, ShieldCheck, ShieldAlert, Download } from "lucide-react";
import { PremiumCard } from "./PremiumCard";
import { formatMoney } from "@/lib/utils";
import { getBaseUrl } from "@/lib/get-base-url";
import { CabinetSkeleton } from "@/components/CabinetSkeleton";
import { Stats } from "./shared";

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
  const [fullName, setFullName] = useState<string | null>(null);
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

  // Периодическое обновление баланса, пока вкладка видна (актуализация после зачислений/списаний)
  const BALANCE_POLL_INTERVAL_MS = 25_000;
  useEffect(() => {
    if (!localStorage.getItem("accessToken")) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchProfileAndData();
      }
    }, BALANCE_POLL_INTERVAL_MS);
    return () => clearInterval(id);
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

  if (loading) {
    return <CabinetSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[320px] flex flex-col items-center">
                <p className="w-full text-center text-lg font-semibold text-white mb-3">
                  {fullName?.trim() || "Официант"}
                </p>
                <div className="w-full overflow-hidden">
                  <PremiumCard fullName={fullName} uniqueId={uniqueId} balanceKop={stats?.balanceKop ?? undefined} compact />
                </div>
              </div>
            </div>

            {verificationStatus && (
              <div className="cabinet-limits-block cabinet-verification-status mt-6 w-full min-w-0 max-w-full rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-5">
                {verificationStatus === "VERIFIED" ? (
                  <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-2 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="font-semibold leading-none text-white">Аккаунт верифицирован!</span>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600/20 text-green-500">
                        <ShieldCheck className="h-5 w-5" aria-hidden />
                      </div>
                    </div>
                    <p className="w-full text-center text-sm text-white">Ваша личность подтверждена.</p>
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
                      className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-semibold text-[#0a192f] hover:opacity-90"
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
                      <span className="cabinet-limits-label text-[var(--color-text-secondary)]">Заявок в сутки</span>
                      <span className="font-medium text-[var(--color-text)]">
                        {payoutUsageToday?.count ?? 0} из {payoutLimits.dailyLimitCount}
                      </span>
                    </div>
                    <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                      <div
                        className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300"
                        style={{
                          width: `${Math.min(100, ((payoutUsageToday?.count ?? 0) / payoutLimits.dailyLimitCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="cabinet-limits-label text-[var(--color-text-secondary)]">Сумма в сутки</span>
                      <span className="font-medium text-[var(--color-text)]">
                        {formatMoney(BigInt(payoutUsageToday?.sumKop ?? 0))} из {formatMoney(BigInt(payoutLimits.dailyLimitKop))}
                      </span>
                    </div>
                    <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                      <div
                        className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300"
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
                          <span className="cabinet-limits-label text-[var(--color-text-secondary)]">Заявок в месяц</span>
                          <span className="font-medium text-[var(--color-text)]">
                            {payoutUsageMonth?.count ?? 0} из {payoutLimits.monthlyLimitCount}
                          </span>
                        </div>
                        <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                          <div
                            className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300"
                            style={{
                              width: `${Math.min(100, payoutLimits.monthlyLimitCount > 0 ? ((payoutUsageMonth?.count ?? 0) / payoutLimits.monthlyLimitCount) * 100 : 0)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="cabinet-limits-label text-[var(--color-text-secondary)]">Сумма в месяц</span>
                          <span className="font-medium text-[var(--color-text)]">
                            {formatMoney(BigInt(payoutUsageMonth?.sumKop ?? 0))} из {formatMoney(BigInt(payoutLimits.monthlyLimitKop))}
                          </span>
                        </div>
                        <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                          <div
                            className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300"
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

        <div id="quick-actions" className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
          <div className="border-0 px-6 py-4 text-center">
            <h3 className="font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)] text-center">
              Быстрые действия
            </h3>
          </div>
          <div className="p-6">
            {/* 1. Goal card — saved goal text + "Изменить" or input + "Сохранить" */}
            <div className="cabinet-block-inner mb-6 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-4">
              <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">Укажите цель, на которую собираете: 🎯</div>
              {savingFor && !savingForEditing ? (
                <>
                  <p className="mb-3 text-[14px] text-[var(--color-text)]">{savingFor}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSavingForEditing(true);
                      setSavingForEdit(savingFor);
                    }}
                    className="rounded-[10px] border border-[var(--color-brand-gold)]/40 bg-transparent px-4 py-2 text-[14px] font-semibold text-[var(--color-brand-gold)] transition-all hover:bg-[var(--color-brand-gold)]/15"
                  >
                    Изменить
                  </button>
                </>
              ) : (
                <>
                  <div className="cabinet-input-window mb-3 w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-bg-sides)] px-3 py-2 text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]/50">
                    <input
                      type="text"
                      value={savingForEdit}
                      onChange={(e) => setSavingForEdit(e.target.value)}
                      placeholder="Например: новый ноутбук, отпуск…"
                      maxLength={500}
                      className="w-full min-w-0 bg-transparent"
                      aria-label="Цель (на что коплю)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveSavingFor}
                    disabled={savingForSaving || (savingForEdit.trim() || null) === (savingFor ?? null)}
                    className="rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 text-[14px] font-semibold text-[#0a192f] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingForSaving ? "Сохранение…" : "Сохранить"}
                  </button>
                </>
              )}
            </div>

            {/* 2. Four quick action cards */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              {QUICK_ACTIONS.map(({ href, icon: Icon, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="cabinet-block-inner flex flex-col items-center rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-6 transition-all hover:bg-[var(--color-accent-gold)]/15 hover:-translate-y-1 shadow-[var(--shadow-subtle)]"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-gold)] text-[#0a192f]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-[var(--color-text)] text-center">{title}</div>
                  <div className="mt-1 text-center text-sm text-[var(--color-text)]/90">{desc}</div>
                </Link>
              ))}
            </div>

            {/* 3. Your link for tea — at the bottom */}
            {tipLink && (
              <div className="cabinet-block-inner rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-4">
                <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">Ваша ссылка для чаевых</div>
                <div className="cabinet-input-window mb-3 break-all rounded-lg bg-[var(--color-bg-sides)] px-3 py-2 font-mono text-xs text-[var(--color-text)]/90">
                  {tipLink}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={copyTipLink}
                    className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 text-[14px] font-semibold text-[#0a192f] transition-all hover:opacity-90"
                  >
                    <Copy className="h-4 w-4" />
                    {linkCopied ? "Скопировано!" : "Копировать ссылку"}
                  </button>
                  <a
                    href={tipLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cabinet-card-btn-link inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 text-[14px] font-semibold text-[#0a192f] transition-all hover:opacity-90"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Перейти по ссылке
                  </a>
                </div>
              </div>
            )}
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
          <p className="mb-6">
            <a
              href={`${getBaseUrl()}/freetips.apk`}
              download="freetips.apk"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/30 bg-[var(--color-bg-sides)] px-4 py-2.5 text-[14px] font-semibold text-[var(--color-text)] transition-all hover:bg-[var(--color-light-gray)] focus:outline-none"
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
                Ключ скрыт для безопасности. Чтобы скопировать его или ввести в приложении — нажмите «Создать новый ключ», затем сразу скопируйте ключ и вставьте в приложение. Старый ключ перестанет работать.
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
                    className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-bg-sides)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] shadow-sm transition-all duration-200 hover:bg-[var(--color-light-gray)] hover:shadow-md active:scale-[0.98] active:shadow-inner focus:outline-none"
                  >
                    <Copy className="h-4 w-4 shrink-0" />
                    {apiKeyCopied ? "Скопировано" : "Копировать"}
                  </button>
                  <button
                    type="button"
                    onClick={regenerateApiKey}
                    disabled={apiKeyLoading}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90 disabled:opacity-50"
                  >
                    <RotateCw className="h-4 w-4" />
                    {apiKeyLoading ? "Создаём…" : "Создать новый ключ"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={regenerateApiKey}
                  disabled={apiKeyLoading}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90 disabled:opacity-50"
                >
                  <Key className="h-4 w-4" />
                  {apiKeyLoading ? "Создаём…" : hasApiKey ? "Создать новый ключ" : "Создать ключ"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
