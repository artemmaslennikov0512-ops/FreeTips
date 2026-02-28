"use client";

import { useEffect, useState } from "react";

const ANTIFRAUD_INPUT =
  "antifraud-input w-36 min-w-[7rem] rounded-lg border border-[rgba(197,165,114,0.25)] bg-[var(--color-bg-sides)] px-3 py-2 text-center text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-brand-gold)] disabled:bg-[var(--color-light-gray)] read-only:bg-[var(--color-light-gray)]";
const ANTIFRAUD_BTN_APPLY =
  "rounded-xl bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50";
const ANTIFRAUD_BTN_EDIT =
  "rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 hover:border-white/35";

/** Форматирует значение лимита для отображения (сумма в ₽ или число заявок). */
function formatLimitDisplay(value: string | null, kind: "rub" | "count"): string {
  if (value == null || value.trim() === "") return "—";
  const n = kind === "rub" ? parseFloat(value.replace(/\s/g, "").replace(",", ".")) : parseInt(value, 10);
  if (Number.isNaN(n)) return "—";
  if (kind === "rub") return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
  return `${n} заявок`;
}

interface StatsDefaults {
  defaultPayoutDailyLimitCount?: number;
  defaultPayoutDailyLimitKop?: number;
  defaultPayoutMonthlyLimitCount?: number | null;
  defaultPayoutMonthlyLimitKop?: number | null;
  defaultAutoConfirmEnabled?: boolean;
  defaultAutoConfirmThresholdKop?: number | null;
}

export default function AdminAntifraudPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
          setLoadError("Ошибка загрузки настроек");
          return;
        }

        const data = (await res.json()) as StatsDefaults;
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
        setLoadError("Ошибка загрузки настроек");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">{loadError}</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <h1 className="antifraud-page-title mb-6 text-xl font-semibold text-white">Антифрод и лимиты</h1>

      <section className="cabinet-section-header rounded-2xl border-0 p-4 sm:p-6">
        <div className="antifraud-inner cabinet-block-inner min-w-0 rounded-xl border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/85 p-4 sm:p-5">
          {antifraudMessage && (
            <p className="mb-4 text-center text-sm text-white">
              {antifraudMessage.text}
            </p>
          )}
          <p className="mb-4 text-xs text-white/80">
            Текущие значения видны ниже; «—» — не задано (для массового применения или в карточке пользователя).
          </p>
          <div className="antifraud-limits-list min-w-0 space-y-4">
            <div className="antifraud-limit-rows space-y-4">
              {/* 1. Макс. сумма одной операции вывода */}
              <div className="antifraud-limit-row flex min-w-0 flex-wrap items-center gap-2 border-0 pb-4 sm:gap-4">
                <div className="min-w-0 flex-[1_1_100%] text-sm font-medium text-white sm:min-w-[180px] sm:flex-none sm:shrink-0">
                  1. Макс. сумма одной операции вывода
                </div>
                <div className="flex min-w-0 max-w-full flex-1 basis-0 justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-base font-semibold text-white" aria-label="Текущий лимит">
                      {formatLimitDisplay(appliedAutoConfirmRub, "rub")}
                    </span>
                  )}
                </div>
                <div className="shrink-0 sm:pr-2">
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
              <div className="antifraud-limit-row flex min-w-0 flex-wrap items-center gap-2 border-0 pb-4 sm:gap-4">
                <div className="min-w-0 flex-[1_1_100%] text-sm font-medium text-white sm:min-w-[180px] sm:flex-none sm:shrink-0">
                  2. Суточный лимит вывода
                </div>
                <div className="flex min-w-0 max-w-full flex-1 basis-0 justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-base font-semibold text-white" aria-label="Текущий лимит">
                      {formatLimitDisplay(appliedDailyRub, "rub")}
                    </span>
                  )}
                </div>
                <div className="shrink-0 sm:pr-2">
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
              <div className="antifraud-limit-row flex min-w-0 flex-wrap items-center gap-2 border-0 pb-4 sm:gap-4">
                <div className="min-w-0 flex-[1_1_100%] text-sm font-medium text-white sm:min-w-[180px] sm:flex-none sm:shrink-0">
                  3. Месячный лимит вывода
                </div>
                <div className="flex min-w-0 max-w-full flex-1 basis-0 justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-base font-semibold text-white" aria-label="Текущий лимит">
                      {formatLimitDisplay(appliedMonthlyRub, "rub")}
                    </span>
                  )}
                </div>
                <div className="shrink-0 sm:pr-2">
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
              <div className="antifraud-limit-row flex min-w-0 flex-wrap items-center gap-2 border-0 pb-4 sm:gap-4">
                <div className="min-w-0 flex-[1_1_100%] text-sm font-medium text-white sm:min-w-[180px] sm:flex-none sm:shrink-0">
                  4. Суточный лимит заявок
                </div>
                <div className="flex min-w-0 max-w-full flex-1 basis-0 justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-base font-semibold text-white" title="Текущее значение">
                      {formatLimitDisplay(appliedDailyCount, "count")}
                    </span>
                  )}
                </div>
                <div className="shrink-0 sm:pr-2">
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
              <div className="antifraud-limit-row flex min-w-0 flex-wrap items-center gap-2 border-0 pb-4 sm:gap-4">
                <div className="min-w-0 flex-[1_1_100%] text-sm font-medium text-white sm:min-w-[180px] sm:flex-none sm:shrink-0">
                  5. Месячный лимит заявок
                </div>
                <div className="flex min-w-0 max-w-full flex-1 basis-0 justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-base font-semibold text-white" title="Текущее значение">
                      {formatLimitDisplay(appliedMonthlyCount, "count")}
                    </span>
                  )}
                </div>
                <div className="shrink-0 sm:pr-2">
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

            {/* Тумблер Авто-вывод */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="min-w-[220px] text-sm font-medium text-white">
                Авто-вывод
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="relative inline-block h-6 w-10 shrink-0 rounded-full bg-black/30 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:content-[''] after:transition-transform focus-within:ring-2 focus-within:ring-white/30 focus-within:ring-offset-2 has-[:checked]:bg-[var(--color-brand-gold)] has-[:checked]:after:translate-x-4">
                  <input
                    type="checkbox"
                    checked={autoConfirmEnabled}
                    onChange={(e) => applyAutoConfirmToggle(e.target.checked)}
                    disabled={loadingAutoConfirm}
                    className="sr-only"
                  />
                </span>
                <span className="text-sm text-white/90">Включить автоподтверждение заявок до макс. суммы одной операции</span>
              </label>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/80">
          Индивидуальные лимиты и порог задаются в карточке пользователя (Пользователи → выбрать пользователя).
        </p>
      </section>
    </div>
  );
}
