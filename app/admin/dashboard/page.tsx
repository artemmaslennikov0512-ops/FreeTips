"use client";

import { Fragment, useEffect, useState } from "react";
import { Users, TrendingUp, Send, DollarSign, ChevronDown, ChevronRight, ClipboardCheck, Copy } from "lucide-react";
import { formatMoneyCompact } from "@/lib/utils";

interface Stats {
  usersCount: number;
  transactionsCount: number;
  transactionsSumKop: number;
  payoutsPendingCount: number;
  payoutsPendingSumKop: number;
  period: string;
  defaultPayoutDailyLimitCount?: number;
  defaultPayoutDailyLimitKop?: number;
  defaultPayoutMonthlyLimitCount?: number | null;
  defaultPayoutMonthlyLimitKop?: number | null;
  defaultAutoConfirmEnabled?: boolean;
  defaultAutoConfirmThresholdKop?: number | null;
}

const STORAGE_KEY_ISSUED_LINKS = "admin_issued_registration_links";

const ANTIFRAUD_INPUT =
  "antifraud-input w-36 min-w-[7rem] rounded-lg border border-[rgba(197,165,114,0.25)] bg-[var(--color-bg-sides)] px-3 py-2 text-center text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-brand-gold)] disabled:bg-[var(--color-light-gray)] read-only:bg-[var(--color-light-gray)]";
const ANTIFRAUD_BTN_APPLY =
  "rounded-xl bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50";
const ANTIFRAUD_BTN_EDIT =
  "rounded-xl border-0 bg-[var(--color-bg-sides)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-light-gray)]";

/** Форматирует значение лимита для отображения (сумма в ₽ или число заявок). */
function formatLimitDisplay(value: string | null, kind: "rub" | "count"): string {
  if (value == null || value.trim() === "") return "—";
  const n = kind === "rub" ? parseFloat(value.replace(/\s/g, "").replace(",", ".")) : parseInt(value, 10);
  if (Number.isNaN(n)) return "—";
  if (kind === "rub") return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
  return `${n} заявок`;
}

interface StoredLink {
  link: string;
  expiresAt: string;
}

/** Загружает из localStorage только ссылки, у которых не истёк срок. Очищает хранилище от истёкших. */
function loadIssuedLinksFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ISSUED_LINKS);
    if (!raw) return {};
    const stored = JSON.parse(raw) as Record<string, StoredLink>;
    const now = Date.now();
    const valid: Record<string, string> = {};
    const stillValid: Record<string, StoredLink> = {};
    for (const [id, { link, expiresAt }] of Object.entries(stored)) {
      if (new Date(expiresAt).getTime() > now) {
        valid[id] = link;
        stillValid[id] = stored[id];
      }
    }
    if (Object.keys(stored).length !== Object.keys(stillValid).length) {
      localStorage.setItem(STORAGE_KEY_ISSUED_LINKS, JSON.stringify(stillValid));
    }
    return valid;
  } catch {
    return {};
  }
}

interface RegistrationRequestRow {
  id: string;
  fullName: string;
  dateOfBirth: string;
  establishment: string;
  phone: string;
  activityType: string;
  email: string;
  status: string;
  createdAt: string;
  hasToken: boolean;
  tokenExpiresAt: string | null;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<RegistrationRequestRow[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  /** Выданные ссылки по id заявки (восстанавливаются из localStorage до истечения срока) */
  const [issuedLinksByRequestId, setIssuedLinksByRequestId] = useState<Record<string, string>>({});
  const [antifraudMessage, setAntifraudMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(false);
  const [appliedAutoConfirmRub, setAppliedAutoConfirmRub] = useState<string | null>(null);
  const [editingAutoConfirm, setEditingAutoConfirm] = useState(false);
  const [inputAutoConfirmRub, setInputAutoConfirmRub] = useState("");
  const [loadingAutoConfirm, setLoadingAutoConfirm] = useState(false);
  const [appliedDailyRub, setAppliedDailyRub] = useState<string | null>(null);
  const [editingDailyRub, setEditingDailyRub] = useState(false);
  const [inputDailyRub, setInputDailyRub] = useState("");
  const [loadingDailyRub, setLoadingDailyRub] = useState(false);
  const [appliedMonthlyRub, setAppliedMonthlyRub] = useState<string | null>(null);
  const [editingMonthlyRub, setEditingMonthlyRub] = useState(false);
  const [inputMonthlyRub, setInputMonthlyRub] = useState("");
  const [loadingMonthlyRub, setLoadingMonthlyRub] = useState(false);
  const [appliedDailyCount, setAppliedDailyCount] = useState<string | null>(null);
  const [editingDailyCount, setEditingDailyCount] = useState(false);
  const [inputDailyCount, setInputDailyCount] = useState("");
  const [loadingDailyCount, setLoadingDailyCount] = useState(false);
  const [appliedMonthlyCount, setAppliedMonthlyCount] = useState<string | null>(null);
  const [editingMonthlyCount, setEditingMonthlyCount] = useState(false);
  const [inputMonthlyCount, setInputMonthlyCount] = useState("");
  const [loadingMonthlyCount, setLoadingMonthlyCount] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      try {
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setError("Ошибка загрузки статистики");
          return;
        }

        const data = await res.json();
        setStats(data);
        if (data.defaultPayoutDailyLimitCount != null) {
          setAppliedDailyCount(String(data.defaultPayoutDailyLimitCount));
          setInputDailyCount(String(data.defaultPayoutDailyLimitCount));
        }
        if (data.defaultPayoutDailyLimitKop != null) {
          setAppliedDailyRub(String(Math.round(data.defaultPayoutDailyLimitKop)));
          setInputDailyRub(String(Math.round(data.defaultPayoutDailyLimitKop)));
        }
        if (data.defaultPayoutMonthlyLimitCount != null) {
          setAppliedMonthlyCount(String(data.defaultPayoutMonthlyLimitCount));
          setInputMonthlyCount(String(data.defaultPayoutMonthlyLimitCount));
        }
        if (data.defaultPayoutMonthlyLimitKop != null) {
          setAppliedMonthlyRub(String(Math.round(data.defaultPayoutMonthlyLimitKop)));
          setInputMonthlyRub(String(Math.round(data.defaultPayoutMonthlyLimitKop)));
        }
        if (data.defaultAutoConfirmEnabled !== undefined) setAutoConfirmEnabled(data.defaultAutoConfirmEnabled);
        if (data.defaultAutoConfirmThresholdKop != null) {
          const rub = String(Math.round(data.defaultAutoConfirmThresholdKop / 100));
          setAppliedAutoConfirmRub(rub);
          setInputAutoConfirmRub(rub);
        } else {
          setAppliedAutoConfirmRub(null);
          setInputAutoConfirmRub("");
        }
      } catch {
        setError("Ошибка загрузки статистики");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const fetchRequests = async () => {
      try {
        const res = await fetch("/api/admin/registration-requests", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const rawRequests = (data.requests ?? []) as RegistrationRequestRow[];
        setRequests(rawRequests.map((r) => ({ ...r, tokenExpiresAt: r.tokenExpiresAt ?? null })));
      } catch {
        // ignore
      } finally {
        setRequestsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  useEffect(() => {
    const valid = loadIssuedLinksFromStorage();
    if (Object.keys(valid).length > 0) setIssuedLinksByRequestId(valid);
  }, []);

  const handleApprove = async (id: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setApprovingId(id);
    try {
      const res = await fetch(`/api/admin/registration-requests/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Ошибка одобрения");
        return;
      }
      if (data.link) {
        setIssuedLinksByRequestId((prev) => ({ ...prev, [id]: data.link }));
        const expiresAt = data.expiresAt as string | undefined;
        if (expiresAt) {
          try {
            const raw = localStorage.getItem(STORAGE_KEY_ISSUED_LINKS);
            const stored = raw ? (JSON.parse(raw) as Record<string, StoredLink>) : {};
            stored[id] = { link: data.link, expiresAt };
            localStorage.setItem(STORAGE_KEY_ISSUED_LINKS, JSON.stringify(stored));
          } catch {
            // ignore
          }
        }
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "APPROVED" as const, hasToken: true, tokenExpiresAt: data.expiresAt ?? null }
            : r,
        ),
      );
    } finally {
      setApprovingId(null);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  const applyAutoConfirmToggle = async (enabled: boolean) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoadingAutoConfirm(true);
    setAntifraudMessage(null);
    try {
      const rubStr = appliedAutoConfirmRub ?? "";
      const rub = rubStr === "" ? null : parseFloat(rubStr.replace(",", "."));
      const thresholdKop = rub != null && !Number.isNaN(rub) && rub >= 0 ? Math.round(rub * 100) : null;
      const res = await fetch("/api/admin/users/auto-confirm-bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, thresholdKop }),
      });
      const data = (await res.json()) as { error?: string; updated?: number; message?: string };
      if (!res.ok) {
        setAntifraudMessage({ type: "err", text: data.error ?? "Ошибка" });
        return;
      }
      setAutoConfirmEnabled(enabled);
      setAntifraudMessage({ type: "ok", text: data.message ?? `Обновлено пользователей: ${data.updated ?? 0}` });
      const resStats = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats((prev) => (prev ? { ...prev, ...statsData } : null));
      }
    } catch {
      setAntifraudMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setLoadingAutoConfirm(false);
    }
  };

  const applyAutoConfirm = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoadingAutoConfirm(true);
    setAntifraudMessage(null);
    try {
      const rub = inputAutoConfirmRub.trim() === "" ? null : parseFloat(inputAutoConfirmRub.trim().replace(",", "."));
      const thresholdKop = rub != null && !Number.isNaN(rub) && rub >= 0 ? Math.round(rub * 100) : null;
      if (inputAutoConfirmRub.trim() !== "" && (Number.isNaN(rub!) || (rub ?? 0) < 0)) {
        setAntifraudMessage({ type: "err", text: "Введите корректную сумму (₽)" });
        setLoadingAutoConfirm(false);
        return;
      }
      const res = await fetch("/api/admin/users/auto-confirm-bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: autoConfirmEnabled, thresholdKop }),
      });
      const data = (await res.json()) as { error?: string; updated?: number; message?: string };
      if (!res.ok) {
        setAntifraudMessage({ type: "err", text: data.error ?? "Ошибка" });
        return;
      }
      const applied = inputAutoConfirmRub.trim() !== "" ? inputAutoConfirmRub.trim() : null;
      setAppliedAutoConfirmRub(applied);
      setInputAutoConfirmRub(applied ?? "");
      setEditingAutoConfirm(false);
      setAntifraudMessage({ type: "ok", text: data.message ?? `Обновлено пользователей: ${data.updated ?? 0}` });
      const resStats = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats((prev) => (prev ? { ...prev, ...statsData } : null));
        if (statsData.defaultAutoConfirmEnabled !== undefined) setAutoConfirmEnabled(statsData.defaultAutoConfirmEnabled);
      }
    } catch {
      setAntifraudMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setLoadingAutoConfirm(false);
    }
  };

  const applyDailyRub = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoadingDailyRub(true);
    setAntifraudMessage(null);
    try {
      const rub = inputDailyRub.trim() === "" ? null : parseFloat(inputDailyRub.trim().replace(",", "."));
      if (inputDailyRub.trim() !== "" && (Number.isNaN(rub!) || (rub ?? 0) < 0)) {
        setAntifraudMessage({ type: "err", text: "Введите корректную сумму (₽)" });
        setLoadingDailyRub(false);
        return;
      }
      const res = await fetch("/api/admin/users/limits-bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ dailyLimitKop: rub != null && !Number.isNaN(rub) ? Math.round(rub * 100) : null }),
      });
      const data = (await res.json()) as { error?: string; updated?: number; message?: string };
      if (!res.ok) {
        setAntifraudMessage({ type: "err", text: data.error ?? "Ошибка" });
        return;
      }
      const applied = inputDailyRub.trim() !== "" ? inputDailyRub.trim() : null;
      setAppliedDailyRub(applied);
      setInputDailyRub(applied ?? "");
      setEditingDailyRub(false);
      setAntifraudMessage({ type: "ok", text: data.message ?? `Обновлено пользователей: ${data.updated ?? 0}` });
    } catch {
      setAntifraudMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setLoadingDailyRub(false);
    }
  };

  const applyMonthlyRub = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoadingMonthlyRub(true);
    setAntifraudMessage(null);
    try {
      const rub = inputMonthlyRub.trim() === "" ? null : parseFloat(inputMonthlyRub.trim().replace(",", "."));
      if (inputMonthlyRub.trim() !== "" && (Number.isNaN(rub!) || (rub ?? 0) < 0)) {
        setAntifraudMessage({ type: "err", text: "Введите корректную сумму (₽)" });
        setLoadingMonthlyRub(false);
        return;
      }
      const res = await fetch("/api/admin/users/limits-bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyLimitKop: rub != null && !Number.isNaN(rub) ? Math.round(rub * 100) : null }),
      });
      const data = (await res.json()) as { error?: string; updated?: number; message?: string };
      if (!res.ok) {
        setAntifraudMessage({ type: "err", text: data.error ?? "Ошибка" });
        return;
      }
      const applied = inputMonthlyRub.trim() !== "" ? inputMonthlyRub.trim() : null;
      setAppliedMonthlyRub(applied);
      setInputMonthlyRub(applied ?? "");
      setEditingMonthlyRub(false);
      setAntifraudMessage({ type: "ok", text: data.message ?? `Обновлено пользователей: ${data.updated ?? 0}` });
    } catch {
      setAntifraudMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setLoadingMonthlyRub(false);
    }
  };

  const applyDailyCount = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoadingDailyCount(true);
    setAntifraudMessage(null);
    try {
      const count = inputDailyCount.trim() === "" ? null : parseInt(inputDailyCount.trim(), 10);
      if (inputDailyCount.trim() !== "" && (Number.isNaN(count!) || (count ?? 0) < 0 || (count ?? 0) > 100)) {
        setAntifraudMessage({ type: "err", text: "Число от 0 до 100" });
        setLoadingDailyCount(false);
        return;
      }
      const res = await fetch("/api/admin/users/limits-bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ dailyLimitCount: count ?? null }),
      });
      const data = (await res.json()) as { error?: string; updated?: number; message?: string };
      if (!res.ok) {
        setAntifraudMessage({ type: "err", text: data.error ?? "Ошибка" });
        return;
      }
      const applied = inputDailyCount.trim() !== "" ? inputDailyCount.trim() : null;
      setAppliedDailyCount(applied);
      setInputDailyCount(applied ?? "");
      setEditingDailyCount(false);
      setAntifraudMessage({ type: "ok", text: data.message ?? `Обновлено пользователей: ${data.updated ?? 0}` });
    } catch {
      setAntifraudMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setLoadingDailyCount(false);
    }
  };

  const applyMonthlyCount = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoadingMonthlyCount(true);
    setAntifraudMessage(null);
    try {
      const count = inputMonthlyCount.trim() === "" ? null : parseInt(inputMonthlyCount.trim(), 10);
      if (inputMonthlyCount.trim() !== "" && (Number.isNaN(count!) || (count ?? 0) < 0 || (count ?? 0) > 3000)) {
        setAntifraudMessage({ type: "err", text: "Число от 0 до 3000" });
        setLoadingMonthlyCount(false);
        return;
      }
      const res = await fetch("/api/admin/users/limits-bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyLimitCount: count ?? null }),
      });
      const data = (await res.json()) as { error?: string; updated?: number; message?: string };
      if (!res.ok) {
        setAntifraudMessage({ type: "err", text: data.error ?? "Ошибка" });
        return;
      }
      const applied = inputMonthlyCount.trim() !== "" ? inputMonthlyCount.trim() : null;
      setAppliedMonthlyCount(applied);
      setInputMonthlyCount(applied ?? "");
      setEditingMonthlyCount(false);
      setAntifraudMessage({ type: "ok", text: data.message ?? `Обновлено пользователей: ${data.updated ?? 0}` });
    } catch {
      setAntifraudMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setLoadingMonthlyCount(false);
    }
  };

  const getLinkForRequest = (requestId: string) => issuedLinksByRequestId[requestId];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">{error || "Ошибка загрузки"}</div>
      </div>
    );
  }

  const cards = [
    { title: "Пользователей", value: stats.usersCount.toLocaleString("ru-RU"), icon: Users },
    { title: "Транзакций", value: stats.transactionsCount.toLocaleString("ru-RU"), icon: TrendingUp },
    { title: "Сумма транзакций", value: formatMoneyCompact(stats.transactionsSumKop), icon: DollarSign },
    { title: "Заявок на вывод", value: stats.payoutsPendingCount.toLocaleString("ru-RU"), icon: Send },
    { title: "Сумма заявок", value: formatMoneyCompact(stats.payoutsPendingSumKop), icon: DollarSign },
  ];

  return (
    <div className="min-w-0 max-w-full">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="cabinet-section-header rounded-2xl border-0 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">{card.title}</p>
                  <p className="mt-2 text-xl font-bold text-[var(--color-text)]">{card.value}</p>
                </div>
                <div className="rounded-xl bg-[var(--color-light-gray)] p-3">
                  <Icon className="h-6 w-6 text-[var(--color-brand-gold)]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="cabinet-section-header mt-10 rounded-2xl border-0 p-6">
        <div className="antifraud-inner rounded-xl border-0 bg-[var(--color-light-gray)] p-5">
          {antifraudMessage && (
            <p className="mb-4 text-center text-sm text-[var(--color-text)]">
              {antifraudMessage.text}
            </p>
          )}
          <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
            Текущие значения видны ниже; «—» — не задано (для массового применения или в карточке пользователя).
          </p>
          <div className="antifraud-limits-list space-y-4">
            <div className="antifraud-limit-rows space-y-4">
            {/* 1. Макс. сумма одной операции вывода */}
            <div className="antifraud-limit-row flex items-center gap-4 border-0 pb-4">
              <div className="min-w-[220px] shrink-0 text-sm font-medium text-[var(--color-text)]">
                1. Макс. сумма одной операции вывода
              </div>
              <div className="flex min-w-[8rem] flex-1 justify-center">
                {editingAutoConfirm ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputAutoConfirmRub}
                    onChange={(e) => setInputAutoConfirmRub(e.target.value)}
                    placeholder="сумма за 1 раз (₽)"
                    className={ANTIFRAUD_INPUT}
                  />
                ) : (
                  <span className="antifraud-value text-base font-semibold text-[var(--color-text)]" aria-label="Текущий лимит">
                    {formatLimitDisplay(appliedAutoConfirmRub, "rub")}
                  </span>
                )}
              </div>
              <div className="shrink-0 pr-4">
              {editingAutoConfirm ? (
                <button
                  type="button"
                  onClick={applyAutoConfirm}
                  disabled={loadingAutoConfirm}
                  className={ANTIFRAUD_BTN_APPLY}
                >
                  {loadingAutoConfirm ? "Применяем…" : "Применить"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingAutoConfirm(true)}
                  className={ANTIFRAUD_BTN_EDIT}
                >
                  Изменить
                </button>
              )}
              </div>
            </div>

            {/* 2. Суточный лимит вывода (сумма) */}
            <div className="antifraud-limit-row flex items-center gap-4 border-0 pb-4">
              <div className="min-w-[220px] shrink-0 text-sm font-medium text-[var(--color-text)]">
                2. Суточный лимит вывода
              </div>
              <div className="flex min-w-[8rem] flex-1 justify-center">
                {editingDailyRub ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputDailyRub}
                    onChange={(e) => setInputDailyRub(e.target.value)}
                    placeholder="сумма (₽)"
                    className={ANTIFRAUD_INPUT}
                  />
                ) : (
                  <span className="antifraud-value text-base font-semibold text-[var(--color-text)]" aria-label="Текущий лимит">
                    {formatLimitDisplay(appliedDailyRub, "rub")}
                  </span>
                )}
              </div>
              <div className="shrink-0 pr-4">
              {editingDailyRub ? (
                <button
                  type="button"
                  onClick={applyDailyRub}
                  disabled={loadingDailyRub}
                  className={ANTIFRAUD_BTN_APPLY}
                >
                  {loadingDailyRub ? "Применяем…" : "Применить"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDailyRub(true)}
                  className={ANTIFRAUD_BTN_EDIT}
                >
                  Изменить
                </button>
              )}
              </div>
            </div>

            {/* 3. Месячный лимит вывода (сумма) */}
            <div className="antifraud-limit-row flex items-center gap-4 border-0 pb-4">
              <div className="min-w-[220px] shrink-0 text-sm font-medium text-[var(--color-text)]">
                3. Месячный лимит вывода
              </div>
              <div className="flex min-w-[8rem] flex-1 justify-center">
                {editingMonthlyRub ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputMonthlyRub}
                    onChange={(e) => setInputMonthlyRub(e.target.value)}
                    placeholder="сумма (₽)"
                    className={ANTIFRAUD_INPUT}
                  />
                ) : (
                  <span className="antifraud-value text-base font-semibold text-[var(--color-text)]" aria-label="Текущий лимит">
                    {formatLimitDisplay(appliedMonthlyRub, "rub")}
                  </span>
                )}
              </div>
              <div className="shrink-0 pr-4">
              {editingMonthlyRub ? (
                <button
                  type="button"
                  onClick={applyMonthlyRub}
                  disabled={loadingMonthlyRub}
                  className={ANTIFRAUD_BTN_APPLY}
                >
                  {loadingMonthlyRub ? "Применяем…" : "Применить"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingMonthlyRub(true)}
                  className={ANTIFRAUD_BTN_EDIT}
                >
                  Изменить
                </button>
              )}
              </div>
            </div>

            {/* 4. Суточный лимит заявок */}
            <div className="antifraud-limit-row flex items-center gap-4 border-0 pb-4">
              <div className="min-w-[220px] shrink-0 text-sm font-medium text-[var(--color-text)]">
                4. Суточный лимит заявок
              </div>
              <div className="flex min-w-[8rem] flex-1 justify-center">
                {editingDailyCount ? (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={inputDailyCount}
                    onChange={(e) => setInputDailyCount(e.target.value)}
                    placeholder="заявок"
                    className={ANTIFRAUD_INPUT}
                  />
                ) : (
                  <span className="antifraud-value text-base font-semibold text-[var(--color-text)]" title="Текущее значение">
                    {formatLimitDisplay(appliedDailyCount, "count")}
                  </span>
                )}
              </div>
              <div className="shrink-0 pr-4">
              {editingDailyCount ? (
                <button
                  type="button"
                  onClick={applyDailyCount}
                  disabled={loadingDailyCount}
                  className={ANTIFRAUD_BTN_APPLY}
                >
                  {loadingDailyCount ? "Применяем…" : "Применить"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDailyCount(true)}
                  className={ANTIFRAUD_BTN_EDIT}
                >
                  Изменить
                </button>
              )}
              </div>
            </div>

            {/* 5. Месячный лимит заявок */}
            <div className="antifraud-limit-row flex items-center gap-4 border-0 pb-4">
              <div className="min-w-[220px] shrink-0 text-sm font-medium text-[var(--color-text)]">
                5. Месячный лимит заявок
              </div>
              <div className="flex min-w-[8rem] flex-1 justify-center">
                {editingMonthlyCount ? (
                  <input
                    type="number"
                    min={0}
                    max={3000}
                    value={inputMonthlyCount}
                    onChange={(e) => setInputMonthlyCount(e.target.value)}
                    placeholder="заявок"
                    className={ANTIFRAUD_INPUT}
                  />
                ) : (
                  <span className="antifraud-value text-base font-semibold text-[var(--color-text)]" title="Текущее значение">
                    {formatLimitDisplay(appliedMonthlyCount, "count")}
                  </span>
                )}
              </div>
              <div className="shrink-0 pr-4">
              {editingMonthlyCount ? (
                <button
                  type="button"
                  onClick={applyMonthlyCount}
                  disabled={loadingMonthlyCount}
                  className={ANTIFRAUD_BTN_APPLY}
                >
                  {loadingMonthlyCount ? "Применяем…" : "Применить"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingMonthlyCount(true)}
                  className={ANTIFRAUD_BTN_EDIT}
                >
                  Изменить
                </button>
              )}
              </div>
            </div>
            </div>

            {/* Тумблер Авто-вывод — внизу блока */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="min-w-[220px] text-sm font-medium text-[var(--color-text)]">
                Авто-вывод
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="relative inline-block h-6 w-10 shrink-0 rounded-full bg-[var(--color-dark-gray)]/30 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-[var(--color-white)] after:shadow after:content-[''] after:transition-transform focus-within:ring-2 focus-within:ring-[var(--color-muted)] focus-within:ring-offset-2 has-[:checked]:bg-[var(--color-muted)] has-[:checked]:after:translate-x-4">
                  <input
                    type="checkbox"
                    checked={autoConfirmEnabled}
                    onChange={(e) => applyAutoConfirmToggle(e.target.checked)}
                    disabled={loadingAutoConfirm}
                    className="sr-only"
                  />
                </span>
                <span className="text-sm text-[var(--color-text)]">Включить автоподтверждение заявок до макс. суммы одной операции</span>
              </label>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-text-secondary)]">
          Индивидуальные лимиты и порог задаются в карточке пользователя (Пользователи → выбрать пользователя).
        </p>
      </section>

      <section className="mt-10">
        {requestsLoading ? (
          <p className="text-[var(--color-muted)]">Загрузка заявок...</p>
        ) : (() => {
          const now = Date.now();
          const visibleRequests = requests.filter((r) => {
            if (r.status !== "APPROVED" || !r.tokenExpiresAt) return true;
            return new Date(r.tokenExpiresAt).getTime() > now;
          });
          return visibleRequests.length === 0 ? (
            <p className="text-[var(--color-muted)]">Заявок пока нет.</p>
          ) : (
          <div className="cabinet-section-header overflow-hidden rounded-2xl border-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-0 bg-[var(--color-light-gray)]">
                    <th className="w-8 p-3 text-[var(--color-muted)]"></th>
                    <th className="p-3 font-medium text-[var(--color-text-secondary)]">ФИО</th>
                    <th className="p-3 font-medium text-[var(--color-text-secondary)]">Почта</th>
                    <th className="p-3 font-medium text-[var(--color-text-secondary)]">Дата заявки</th>
                    <th className="p-3 font-medium text-[var(--color-text-secondary)]">Статус</th>
                    <th className="p-3 font-medium text-[var(--color-text-secondary)]">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRequests.map((r) => {
                    const isExpanded = expandedId === r.id;
                    const isApproving = approvingId === r.id;
                    const linkForRow = getLinkForRequest(r.id);
                    return (
                      <Fragment key={r.id}>
                        <tr
                          className="border-0 hover:bg-[var(--color-light-gray)] transition-colors"
                        >
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : r.id)}
                              className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-light-gray)] hover:text-[var(--color-text)]"
                              aria-label={isExpanded ? "Свернуть" : "Развернуть"}
                            >
                              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </button>
                          </td>
                          <td className="p-3 text-[var(--color-text-secondary)]">{r.fullName}</td>
                          <td className="p-3 text-[var(--color-text-secondary)]">{r.email}</td>
                          <td className="p-3 text-[var(--color-muted)]">
                            {new Date(r.createdAt).toLocaleDateString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                r.status === "PENDING"
                                  ? "bg-[var(--color-light-gray)] text-[var(--color-text)]"
                                  : r.status === "APPROVED"
                                    ? "bg-[var(--color-light-gray)] text-[var(--color-text)]"
                                    : "bg-[var(--color-light-gray)] text-[var(--color-text-secondary)]"
                              }`}
                            >
                              {r.status === "PENDING" ? "Ожидает" : r.status === "APPROVED" ? "Принята" : r.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {r.status === "PENDING" && !r.hasToken && (
                              <button
                                type="button"
                                disabled={isApproving}
                                onClick={() => handleApprove(r.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-gold)] px-3 py-1.5 text-sm font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
                              >
                                <ClipboardCheck className="h-4 w-4" />
                                {isApproving ? "Создание ссылки..." : "Принять подключение"}
                              </button>
                            )}
                            {linkForRow && (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={linkForRow}
                                    className="max-w-[280px] rounded border-0 bg-[var(--color-light-gray)] px-2 py-1 text-xs text-[var(--color-text)]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => copyLink(linkForRow)}
                                    className="rounded p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-light-gray)] hover:text-[var(--color-text)]"
                                    title="Копировать"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                </div>
                                <span className="text-xs text-[var(--color-muted)]">Одноразовая ссылка — только одна регистрация</span>
                              </div>
                            )}
                            {r.status === "APPROVED" && r.hasToken && !linkForRow && (
                              <span className="text-xs text-[var(--color-muted)]">Ссылка выдана (одноразовая, скопируйте при выдаче)</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-0 bg-[var(--color-light-gray)]">
                            <td colSpan={6} className="p-4">
                              <div className="grid gap-2 text-[var(--color-text-secondary)] sm:grid-cols-2">
                                <p><span className="text-[var(--color-muted)]">Дата рождения:</span> {r.dateOfBirth}</p>
                                <p><span className="text-[var(--color-muted)]">Заведение:</span> {r.establishment}</p>
                                <p><span className="text-[var(--color-muted)]">Телефон:</span> {r.phone}</p>
                                <p><span className="text-[var(--color-muted)]">Вид деятельности:</span> {r.activityType}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}
      </section>
    </div>
  );
}
