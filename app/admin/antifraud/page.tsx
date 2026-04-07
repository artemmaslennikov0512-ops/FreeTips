"use client";

import { useEffect, useState } from "react";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
import { RecipientPayLimitsCard } from "@/components/admin/RecipientPayLimitsCard";
import { FraudSignalsSection } from "./FraudSignalsSection";
import { ADMIN_PANEL_STATE_CENTER } from "@/lib/admin-surface-classes";

const ANTIFRAUD_INPUT =
  "antifraud-input w-36 min-w-[7rem] max-w-full shrink-0 rounded-lg border border-[rgba(197,165,114,0.25)] bg-[var(--color-bg-sides)] px-3 py-2 text-center text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-brand-gold)] disabled:bg-[var(--color-light-gray)] read-only:bg-[var(--color-light-gray)]";
const ANTIFRAUD_BTN_APPLY = `${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} px-4 py-2 text-sm disabled:opacity-50`;
const ANTIFRAUD_BTN_EDIT = `${ADMIN_BTN} admin-btn--neutral px-4 py-2 text-sm`;

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
  defaultIncomingMonthlyLimitKop?: number | null;
  defaultAutoConfirmEnabled?: boolean;
  defaultAutoConfirmThresholdKop?: number | null;
}

interface FraudObserveEffective {
  payoutWindowMinutes: number;
  payoutMinCount: number;
  payInitWindowMinutes: number;
  payInitMinCount: number;
  paySuccessIpWindowMinutes: number;
  paySuccessIpMinCount: number;
  sharedIpMinAccounts: number;
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
  const [appliedIncomingMonthlyRub, setAppliedIncomingMonthlyRub] = useState<string | null>(null);
  const [editingIncomingMonthlyRub, setEditingIncomingMonthlyRub] = useState(false);
  const [inputIncomingMonthlyRub, setInputIncomingMonthlyRub] = useState("");
  const [loadingIncomingMonthlyRub, setLoadingIncomingMonthlyRub] = useState(false);
  const [appliedDailyCount, setAppliedDailyCount] = useState<string | null>(null);
  const [editingDailyCount, setEditingDailyCount] = useState(false);
  const [inputDailyCount, setInputDailyCount] = useState("");
  const [loadingDailyCount, setLoadingDailyCount] = useState(false);
  const [appliedMonthlyCount, setAppliedMonthlyCount] = useState<string | null>(null);
  const [editingMonthlyCount, setEditingMonthlyCount] = useState(false);
  const [inputMonthlyCount, setInputMonthlyCount] = useState("");
  const [loadingMonthlyCount, setLoadingMonthlyCount] = useState(false);
  const [loadingPushAllLimits, setLoadingPushAllLimits] = useState(false);

  const [observeEffective, setObserveEffective] = useState<FraudObserveEffective | null>(null);
  const [inpPayoutWin, setInpPayoutWin] = useState("");
  const [inpPayoutCnt, setInpPayoutCnt] = useState("");
  const [inpInitWin, setInpInitWin] = useState("");
  const [inpInitCnt, setInpInitCnt] = useState("");
  const [inpSuccWin, setInpSuccWin] = useState("");
  const [inpSuccCnt, setInpSuccCnt] = useState("");
  const [inpSharedIp, setInpSharedIp] = useState("");
  const [loadingObserveSave, setLoadingObserveSave] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      try {
        const [res, obsRes] = await Promise.all([
          fetch("/api/admin/stats", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/admin/fraud-observe-settings", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

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
        if (data.defaultIncomingMonthlyLimitKop != null) {
          setAppliedIncomingMonthlyRub(String(Math.round(data.defaultIncomingMonthlyLimitKop)));
          setInputIncomingMonthlyRub(String(Math.round(data.defaultIncomingMonthlyLimitKop)));
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

        if (obsRes.ok) {
          const obs = (await obsRes.json()) as { effective: FraudObserveEffective };
          const e = obs.effective;
          setObserveEffective(e);
          setInpPayoutWin(String(e.payoutWindowMinutes));
          setInpPayoutCnt(String(e.payoutMinCount));
          setInpInitWin(String(e.payInitWindowMinutes));
          setInpInitCnt(String(e.payInitMinCount));
          setInpSuccWin(String(e.paySuccessIpWindowMinutes));
          setInpSuccCnt(String(e.paySuccessIpMinCount));
          setInpSharedIp(String(e.sharedIpMinAccounts));
        }
      } catch {
        setLoadError("Ошибка загрузки настроек");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const applyObserveSettings = async (resetToBuiltIn: boolean) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoadingObserveSave(true);
    setAntifraudMessage(null);
    try {
      const body = resetToBuiltIn
        ? {
            observePayoutWindowMinutes: null,
            observePayoutMinCount: null,
            observePayInitWindowMinutes: null,
            observePayInitMinCount: null,
            observePaySuccessIpWindowMinutes: null,
            observePaySuccessIpMinCount: null,
            observeSharedIpMinAccounts: null,
          }
        : {
            observePayoutWindowMinutes: parseInt(inpPayoutWin, 10),
            observePayoutMinCount: parseInt(inpPayoutCnt, 10),
            observePayInitWindowMinutes: parseInt(inpInitWin, 10),
            observePayInitMinCount: parseInt(inpInitCnt, 10),
            observePaySuccessIpWindowMinutes: parseInt(inpSuccWin, 10),
            observePaySuccessIpMinCount: parseInt(inpSuccCnt, 10),
            observeSharedIpMinAccounts: parseInt(inpSharedIp, 10),
          };

      if (!resetToBuiltIn) {
        const nums = [
          body.observePayoutWindowMinutes,
          body.observePayoutMinCount,
          body.observePayInitWindowMinutes,
          body.observePayInitMinCount,
          body.observePaySuccessIpWindowMinutes,
          body.observePaySuccessIpMinCount,
          body.observeSharedIpMinAccounts,
        ];
        if (nums.some((n) => !Number.isFinite(n) || Number.isNaN(n))) {
          setAntifraudMessage({ type: "err", text: "Введите целые числа во все поля" });
          setLoadingObserveSave(false);
          return;
        }
      }

      const res = await fetch("/api/admin/fraud-observe-settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; effective?: FraudObserveEffective };
      if (!res.ok) {
        setAntifraudMessage({ type: "err", text: data.error ?? "Ошибка сохранения порогов" });
        return;
      }
      if (data.effective) {
        setObserveEffective(data.effective);
        const e = data.effective;
        setInpPayoutWin(String(e.payoutWindowMinutes));
        setInpPayoutCnt(String(e.payoutMinCount));
        setInpInitWin(String(e.payInitWindowMinutes));
        setInpInitCnt(String(e.payInitMinCount));
        setInpSuccWin(String(e.paySuccessIpWindowMinutes));
        setInpSuccCnt(String(e.paySuccessIpMinCount));
        setInpSharedIp(String(e.sharedIpMinAccounts));
      }
      setAntifraudMessage({
        type: "ok",
        text: resetToBuiltIn ? "Пороги сброшены на встроенные дефолты" : "Пороги наблюдения сохранены",
      });
    } catch {
      setAntifraudMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setLoadingObserveSave(false);
    }
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

  const applyIncomingMonthlyRub = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoadingIncomingMonthlyRub(true);
    setAntifraudMessage(null);
    try {
      const rub =
        inputIncomingMonthlyRub.trim() === "" ? null : parseFloat(inputIncomingMonthlyRub.trim().replace(",", "."));
      if (inputIncomingMonthlyRub.trim() !== "" && (Number.isNaN(rub!) || (rub ?? 0) < 0)) {
        setAntifraudMessage({ type: "err", text: "Введите корректную сумму (₽)" });
        setLoadingIncomingMonthlyRub(false);
        return;
      }
      const res = await fetch("/api/admin/users/limits-bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          incomingMonthlyLimitKop: rub != null && !Number.isNaN(rub) ? Math.round(rub * 100) : null,
        }),
      });
      const data = (await res.json()) as { error?: string; updated?: number; message?: string };
      if (!res.ok) {
        setAntifraudMessage({ type: "err", text: data.error ?? "Ошибка" });
        return;
      }
      const applied = inputIncomingMonthlyRub.trim() !== "" ? inputIncomingMonthlyRub.trim() : null;
      setAppliedIncomingMonthlyRub(applied);
      setInputIncomingMonthlyRub(applied ?? "");
      setEditingIncomingMonthlyRub(false);
      setAntifraudMessage({ type: "ok", text: data.message ?? `Обновлено пользователей: ${data.updated ?? 0}` });
    } catch {
      setAntifraudMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setLoadingIncomingMonthlyRub(false);
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

  /** Текущие значения п. 1–6 и авто-вывод (учитывает режим «Изменить») → один запрос на всех пользователей. */
  const applyPushAllLimits = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const autoRubRaw = (editingAutoConfirm ? inputAutoConfirmRub : appliedAutoConfirmRub ?? "").trim();
    const dailyRubRaw = (editingDailyRub ? inputDailyRub : appliedDailyRub ?? "").trim();
    const incomingRubRaw = (editingIncomingMonthlyRub ? inputIncomingMonthlyRub : appliedIncomingMonthlyRub ?? "").trim();
    const monthlyRubRaw = (editingMonthlyRub ? inputMonthlyRub : appliedMonthlyRub ?? "").trim();
    const dailyCountRaw = (editingDailyCount ? inputDailyCount : appliedDailyCount ?? "").trim();
    const monthlyCountRaw = (editingMonthlyCount ? inputMonthlyCount : appliedMonthlyCount ?? "").trim();

    const parseRubKop = (raw: string): number | null | "bad" => {
      if (raw === "") return null;
      const rub = parseFloat(raw.replace(",", "."));
      if (Number.isNaN(rub) || rub < 0) return "bad";
      return Math.round(rub * 100);
    };
    const autoKop = parseRubKop(autoRubRaw);
    const dailyKop = parseRubKop(dailyRubRaw);
    const incomingKop = parseRubKop(incomingRubRaw);
    const monthlyKop = parseRubKop(monthlyRubRaw);
    if (autoKop === "bad" || dailyKop === "bad" || incomingKop === "bad" || monthlyKop === "bad") {
      setAntifraudMessage({ type: "err", text: "Проверьте суммы в ₽ (п. 1–4)" });
      return;
    }

    let dailyCount: number | null = null;
    if (dailyCountRaw !== "") {
      const parsedDaily = Number.parseInt(dailyCountRaw, 10);
      if (Number.isNaN(parsedDaily) || parsedDaily < 0 || parsedDaily > 100) {
        setAntifraudMessage({ type: "err", text: "П. 5: число заявок от 0 до 100 или пусто" });
        return;
      }
      dailyCount = parsedDaily;
    }

    let monthlyCount: number | null = null;
    if (monthlyCountRaw !== "") {
      const parsedMonthly = Number.parseInt(monthlyCountRaw, 10);
      if (Number.isNaN(parsedMonthly) || parsedMonthly < 0 || parsedMonthly > 3000) {
        setAntifraudMessage({ type: "err", text: "П. 6: число заявок от 0 до 3000 или пусто" });
        return;
      }
      monthlyCount = parsedMonthly;
    }

    const ok = window.confirm(
      "Подтвердите: выставить всем пользователям (кроме суперадмина) лимиты п. 1–6 и авто-вывод в том виде, как сейчас на экране? Точечные лимиты в карточках пользователей будут перезаписаны.",
    );
    if (!ok) return;

    setLoadingPushAllLimits(true);
    setAntifraudMessage(null);
    try {
      const res = await fetch("/api/admin/users/limits-push-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyLimitCount: dailyCount,
          dailyLimitKop: dailyKop,
          monthlyLimitCount: monthlyCount,
          monthlyLimitKop: monthlyKop,
          incomingMonthlyLimitKop: incomingKop,
          autoConfirmPayouts: autoConfirmEnabled,
          autoConfirmThresholdKop: autoKop,
        }),
      });
      const data = (await res.json()) as { error?: string; updated?: number; message?: string };
      if (!res.ok) {
        setAntifraudMessage({ type: "err", text: data.error ?? "Ошибка" });
        return;
      }

      setAppliedAutoConfirmRub(autoRubRaw === "" ? null : autoRubRaw);
      setInputAutoConfirmRub(autoRubRaw === "" ? "" : autoRubRaw);
      setEditingAutoConfirm(false);
      setAppliedDailyRub(dailyRubRaw === "" ? null : dailyRubRaw);
      setInputDailyRub(dailyRubRaw === "" ? "" : dailyRubRaw);
      setEditingDailyRub(false);
      setAppliedIncomingMonthlyRub(incomingRubRaw === "" ? null : incomingRubRaw);
      setInputIncomingMonthlyRub(incomingRubRaw === "" ? "" : incomingRubRaw);
      setEditingIncomingMonthlyRub(false);
      setAppliedMonthlyRub(monthlyRubRaw === "" ? null : monthlyRubRaw);
      setInputMonthlyRub(monthlyRubRaw === "" ? "" : monthlyRubRaw);
      setEditingMonthlyRub(false);
      setAppliedDailyCount(dailyCountRaw === "" ? null : dailyCountRaw);
      setInputDailyCount(dailyCountRaw === "" ? "" : dailyCountRaw);
      setEditingDailyCount(false);
      setAppliedMonthlyCount(monthlyCountRaw === "" ? null : monthlyCountRaw);
      setInputMonthlyCount(monthlyCountRaw === "" ? "" : monthlyCountRaw);
      setEditingMonthlyCount(false);

      setAntifraudMessage({
        type: "ok",
        text: data.message ?? `Обновлено пользователей: ${data.updated ?? 0}`,
      });
    } catch {
      setAntifraudMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setLoadingPushAllLimits(false);
    }
  };

  if (loading) {
    return (
      <div className={ADMIN_PANEL_STATE_CENTER}>
        <div className="text-center text-slate-400">Загрузка…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={ADMIN_PANEL_STATE_CENTER}>
        <div className="max-w-md text-center text-[var(--color-text-secondary)]">{loadError}</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <h1 className="antifraud-page-title text-xl font-semibold text-white text-center">Антифрод и лимиты</h1>

      <FraudSignalsSection />

      <RecipientPayLimitsCard />

      {observeEffective != null && (
        <section className="cabinet-section-header rounded-2xl border-0 p-4 sm:p-6">
          <div className="antifraud-inner cabinet-block-inner min-w-0 rounded-xl border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/85 p-3 sm:p-4">
            <h2 className="mb-3 text-center text-sm font-semibold text-white">Пороги сигналов</h2>
            <div className="space-y-3 text-xs text-white/90">
              <div className="flex w-full max-w-full flex-col items-center gap-2 text-center">
                <span className="font-medium text-white">Частый вывод</span>
                <div className="flex w-full max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-3">
                  <label className="flex min-w-0 flex-col items-center gap-1">
                    <span className="text-xs text-white/60">мин</span>
                    <input
                      type="number"
                      min={1}
                      max={10080}
                      value={inpPayoutWin}
                      onChange={(e) => setInpPayoutWin(e.target.value)}
                      className={ANTIFRAUD_INPUT}
                    />
                  </label>
                  <label className="flex min-w-0 flex-col items-center gap-1">
                    <span className="text-xs text-white/60">заявок ≥</span>
                    <input
                      type="number"
                      min={2}
                      max={50000}
                      value={inpPayoutCnt}
                      onChange={(e) => setInpPayoutCnt(e.target.value)}
                      className={ANTIFRAUD_INPUT}
                    />
                  </label>
                </div>
              </div>
              <div className="flex w-full max-w-full flex-col items-center gap-2 text-center">
                <span className="font-medium text-white">Всплеск по ссылке оплаты</span>
                <div className="flex w-full max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-3">
                  <label className="flex min-w-0 flex-col items-center gap-1">
                    <span className="text-xs text-white/60">мин</span>
                    <input
                      type="number"
                      min={1}
                      max={10080}
                      value={inpInitWin}
                      onChange={(e) => setInpInitWin(e.target.value)}
                      className={ANTIFRAUD_INPUT}
                    />
                  </label>
                  <label className="flex min-w-0 flex-col items-center gap-1">
                    <span className="text-xs text-white/60">созданий ≥</span>
                    <input
                      type="number"
                      min={2}
                      max={50000}
                      value={inpInitCnt}
                      onChange={(e) => setInpInitCnt(e.target.value)}
                      className={ANTIFRAUD_INPUT}
                    />
                  </label>
                </div>
              </div>
              <div className="flex w-full max-w-full flex-col items-center gap-2 text-center">
                <span className="font-medium text-white">Успешные оплаты с одного IP</span>
                <div className="flex w-full max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-3">
                  <label className="flex min-w-0 flex-col items-center gap-1">
                    <span className="text-xs text-white/60">мин</span>
                    <input
                      type="number"
                      min={1}
                      max={10080}
                      value={inpSuccWin}
                      onChange={(e) => setInpSuccWin(e.target.value)}
                      className={ANTIFRAUD_INPUT}
                    />
                  </label>
                  <label className="flex min-w-0 flex-col items-center gap-1">
                    <span className="text-xs text-white/60">успехов ≥</span>
                    <input
                      type="number"
                      min={2}
                      max={50000}
                      value={inpSuccCnt}
                      onChange={(e) => setInpSuccCnt(e.target.value)}
                      className={ANTIFRAUD_INPUT}
                    />
                  </label>
                </div>
              </div>
              <div className="flex w-full max-w-full flex-col items-center gap-2 text-center">
                <span className="max-w-md font-medium text-white">Аккаунты с одного IP</span>
                <label className="flex min-w-0 flex-col items-center gap-1">
                  <span className="text-xs text-white/60">аккаунтов ≥</span>
                  <input
                    type="number"
                    min={2}
                    max={50000}
                    value={inpSharedIp}
                    onChange={(e) => setInpSharedIp(e.target.value)}
                    className={ANTIFRAUD_INPUT}
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 flex w-full max-w-full flex-wrap justify-center gap-x-3 gap-y-2">
              <button
                type="button"
                disabled={loadingObserveSave}
                onClick={() => void applyObserveSettings(false)}
                className={`${ANTIFRAUD_BTN_APPLY} min-w-0 shrink-0`}
              >
                {loadingObserveSave ? "Сохраняем…" : "Сохранить пороги"}
              </button>
              <button
                type="button"
                disabled={loadingObserveSave}
                onClick={() => void applyObserveSettings(true)}
                className={`${ANTIFRAUD_BTN_EDIT} min-w-0 shrink-0`}
              >
                Сбросить к дефолтам
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="cabinet-section-header rounded-2xl border-0 p-4 sm:p-6">
        <div className="antifraud-inner cabinet-block-inner min-w-0 rounded-xl border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/85 p-3 sm:p-4">
          {antifraudMessage && (
            <p className="mb-3 text-center text-sm text-white">
              {antifraudMessage.text}
            </p>
          )}
          <p className="mb-3 text-center text-[11px] text-white/75">
            «—» — не задано. Массово здесь; точечно — в карточке пользователя.
          </p>
          <div className="antifraud-limits-list min-w-0 space-y-2">
            <div className="antifraud-limit-rows space-y-2">
              {/* 1. Макс. сумма одной операции вывода */}
              <div className="antifraud-limit-row flex min-w-0 flex-col items-center gap-2 border-0 border-b border-white/10 pb-2 text-center last:border-b-0 last:pb-0 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                <div className="w-full max-w-xl text-xs font-medium text-white sm:w-auto sm:max-w-[11rem] sm:shrink-0 sm:text-left">
                  1. Макс. вывод за раз
                </div>
                <div className="flex min-w-0 max-w-full justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-sm font-semibold text-white" aria-label="Текущий лимит">
                      {formatLimitDisplay(appliedAutoConfirmRub, "rub")}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 justify-center sm:pr-2">
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
              <div className="antifraud-limit-row flex min-w-0 flex-col items-center gap-2 border-0 border-b border-white/10 pb-2 text-center last:border-b-0 last:pb-0 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                <div className="w-full max-w-xl text-xs font-medium text-white sm:w-auto sm:max-w-[11rem] sm:shrink-0 sm:text-left">
                  2. Суточный вывод (₽)
                </div>
                <div className="flex min-w-0 max-w-full justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-sm font-semibold text-white" aria-label="Текущий лимит">
                      {formatLimitDisplay(appliedDailyRub, "rub")}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 justify-center sm:pr-2">
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

              {/* 3. Месячный лимит поступлений (чаевые) */}
              <div className="antifraud-limit-row flex min-w-0 flex-col items-center gap-2 border-0 border-b border-white/10 pb-2 text-center last:border-b-0 last:pb-0 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                <div className="w-full max-w-xl text-xs font-medium text-white sm:w-auto sm:max-w-[11rem] sm:shrink-0 sm:text-left">
                  3. Месяц: входящие (₽)
                </div>
                <div className="flex min-w-0 max-w-full justify-center overflow-hidden sm:min-w-[8rem]">
                  {editingIncomingMonthlyRub ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inputIncomingMonthlyRub}
                      onChange={(e) => setInputIncomingMonthlyRub(e.target.value)}
                      placeholder="сумма (₽)"
                      className={ANTIFRAUD_INPUT}
                    />
                  ) : (
                    <span className="antifraud-value text-sm font-semibold text-white" aria-label="Текущий лимит">
                      {formatLimitDisplay(appliedIncomingMonthlyRub, "rub")}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 justify-center sm:pr-2">
                  {editingIncomingMonthlyRub ? (
                    <button
                      type="button"
                      onClick={applyIncomingMonthlyRub}
                      disabled={loadingIncomingMonthlyRub}
                      className={ANTIFRAUD_BTN_APPLY}
                    >
                      {loadingIncomingMonthlyRub ? "Применяем…" : "Применить"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingIncomingMonthlyRub(true)}
                      className={ANTIFRAUD_BTN_EDIT}
                    >
                      Изменить
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Месячный лимит вывода (сумма) */}
              <div className="antifraud-limit-row flex min-w-0 flex-col items-center gap-2 border-0 border-b border-white/10 pb-2 text-center last:border-b-0 last:pb-0 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                <div className="w-full max-w-xl text-xs font-medium text-white sm:w-auto sm:max-w-[11rem] sm:shrink-0 sm:text-left">
                  4. Месячный вывод (₽)
                </div>
                <div className="flex min-w-0 max-w-full justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-sm font-semibold text-white" aria-label="Текущий лимит">
                      {formatLimitDisplay(appliedMonthlyRub, "rub")}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 justify-center sm:pr-2">
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

              {/* 5. Суточный лимит заявок */}
              <div className="antifraud-limit-row flex min-w-0 flex-col items-center gap-2 border-0 border-b border-white/10 pb-2 text-center last:border-b-0 last:pb-0 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                <div className="w-full max-w-xl text-xs font-medium text-white sm:w-auto sm:max-w-[11rem] sm:shrink-0 sm:text-left">
                  5. Заявок в сутки
                </div>
                <div className="flex min-w-0 max-w-full justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-sm font-semibold text-white" title="Текущее значение">
                      {formatLimitDisplay(appliedDailyCount, "count")}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 justify-center sm:pr-2">
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

              {/* 6. Месячный лимит заявок */}
              <div className="antifraud-limit-row flex min-w-0 flex-col items-center gap-2 border-0 border-b border-white/10 pb-2 text-center last:border-b-0 last:pb-0 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                <div className="w-full max-w-xl text-xs font-medium text-white sm:w-auto sm:max-w-[11rem] sm:shrink-0 sm:text-left">
                  6. Заявок в месяц
                </div>
                <div className="flex min-w-0 max-w-full justify-center overflow-hidden sm:min-w-[8rem]">
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
                    <span className="antifraud-value text-sm font-semibold text-white" title="Текущее значение">
                      {formatLimitDisplay(appliedMonthlyCount, "count")}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 justify-center sm:pr-2">
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
            <div className="flex flex-col items-center gap-2 border-t border-white/10 pt-3 text-center sm:flex-row sm:flex-wrap sm:justify-center">
              <div className="text-xs font-medium text-white">Авто-вывод</div>
              <label className="flex cursor-pointer flex-col items-center gap-2 sm:flex-row">
                <span className="relative inline-block h-6 w-10 shrink-0 rounded-full bg-black/30 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:content-[''] after:transition-transform focus-within:ring-2 focus-within:ring-white/30 focus-within:ring-offset-2 has-[:checked]:bg-[var(--color-brand-gold)] has-[:checked]:after:translate-x-4">
                  <input
                    type="checkbox"
                    checked={autoConfirmEnabled}
                    onChange={(e) => applyAutoConfirmToggle(e.target.checked)}
                    disabled={loadingAutoConfirm}
                    className="sr-only"
                  />
                </span>
                <span className="max-w-md text-xs text-white/85">До макс. суммы за одну операцию (п. 1)</span>
              </label>
            </div>

            <div className="mt-4 flex w-full max-w-full flex-col items-center gap-2 border-t border-white/10 pt-4 text-center">
              <button
                type="button"
                onClick={() => void applyPushAllLimits()}
                disabled={
                  loadingPushAllLimits ||
                  loadingAutoConfirm ||
                  loadingDailyRub ||
                  loadingIncomingMonthlyRub ||
                  loadingMonthlyRub ||
                  loadingDailyCount ||
                  loadingMonthlyCount
                }
                className={`${ANTIFRAUD_BTN_APPLY} w-full max-w-md sm:w-auto`}
              >
                {loadingPushAllLimits ? "Применяем ко всем…" : "Применить ко всем пользователям"}
              </button>
              <p className="max-w-lg text-[11px] leading-snug text-white/70">
                Одной кнопкой: п. 1–6 и авто-вывод выше — на все аккаунты (кроме суперадмина). Перезаписывает точечные лимиты из карточек пользователей.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-white/70">
          Точечные лимиты — Пользователи → карточка.
        </p>
      </section>
    </div>
  );
}
