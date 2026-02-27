"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, List, Key, Copy, RotateCw, Settings } from "lucide-react";
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
        setError("Не удалось загрузить данные");
        return;
      }
      const profile = (await profileRes.json()) as {
        stats?: Stats;
        apiKey?: string | null;
        fullName?: string | null;
        uniqueId?: string | null;
        payoutLimits?: { dailyLimitCount: number; dailyLimitKop: number; monthlyLimitCount?: number; monthlyLimitKop?: number };
        payoutUsageToday?: { count: number; sumKop: number };
        payoutUsageMonth?: { count: number; sumKop: number };
      };
      setStats(profile.stats ?? null);
      setApiKey(profile.apiKey ?? null);
      setFullName(profile.fullName ?? null);
      setUniqueId(profile.uniqueId ?? null);
      setPayoutLimits(profile.payoutLimits ?? null);
      setPayoutUsageToday(profile.payoutUsageToday ?? null);
      setPayoutUsageMonth(profile.payoutUsageMonth ?? null);
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
          className="mt-4 rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 font-semibold text-[#0a192f] hover:opacity-90"
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
              <div className="w-full max-w-[320px] overflow-hidden rounded-2xl">
                <PremiumCard fullName={fullName} uniqueId={uniqueId} balanceKop={stats?.balanceKop ?? undefined} compact />
              </div>
            </div>

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

        <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
          <div className="border-0 px-6 py-4">
            <h3 className="font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)]">
              Быстрые действия
            </h3>
          </div>
          <div className="p-6">
            {tipLink && (
              <div className="cabinet-block-inner mb-6 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-4">
                <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">Ваша ссылка для чаевых</div>
                <div className="cabinet-input-window mb-3 break-all rounded-lg bg-[var(--color-bg-sides)] px-3 py-2 font-mono text-xs text-[var(--color-text-secondary)]">
                  {tipLink}
                </div>
                <button
                  type="button"
                  onClick={copyTipLink}
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-semibold text-[#0a192f] transition-all hover:opacity-90"
                >
                  <Copy className="h-4 w-4" />
                  {linkCopied ? "Скопировано!" : "Копировать ссылку"}
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
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
                  <div className="mt-1 text-center text-sm text-[var(--color-text-secondary)]">{desc}</div>
                </Link>
              ))}
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
          <p className="mb-6 text-[var(--color-text-secondary)]">
            Скопируйте ключ и введите его в приложении FreeTips — и управляйте личным кабинетом официанта из мобильного приложения. (только для Android)
          </p>
          <div className="cabinet-block-inner rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/6 p-5">
            <div className="mb-4 text-sm font-semibold text-[var(--color-text)]">Ваш API ключ</div>
            <div className="cabinet-input-window cabinet-block-inner mb-4 break-all rounded-md border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-3 font-mono text-sm text-[var(--color-text-secondary)]">
              {apiKey ?? "Ключ не создан"}
            </div>
            <div className="flex flex-wrap gap-3">
              {apiKey ? (
                <>
                  <button
                    type="button"
                    onClick={copyApiKey}
                    className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-bg-sides)] px-5 py-2.5 font-semibold text-[var(--color-text)] shadow-sm transition-all duration-200 hover:bg-[var(--color-light-gray)] hover:shadow-md active:scale-[0.98] active:shadow-inner focus:outline-none"
                  >
                    <Copy className="h-4 w-4 shrink-0" />
                    {apiKeyCopied ? "Код скопирован" : "Копировать"}
                  </button>
                  <button
                    type="button"
                    onClick={regenerateApiKey}
                    disabled={apiKeyLoading}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 font-semibold text-[#0a192f] hover:opacity-90 disabled:opacity-50"
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
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 font-semibold text-[#0a192f] hover:opacity-90 disabled:opacity-50"
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
