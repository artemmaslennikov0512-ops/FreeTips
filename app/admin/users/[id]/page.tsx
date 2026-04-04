"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UserRound,
  Wallet,
  TrendingUp,
  Send,
  ListChecks,
  Clock,
  Sliders,
  Copy,
  Key,
  KeyRound,
  RotateCw,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldOff,
  MonitorSmartphone,
} from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { PAYOUT_MAX_AMOUNT_KOP, PAYOUT_MIN_AMOUNT_KOP } from "@/lib/payout-amount-bounds";
import { formatDate, formatMoneyCompact } from "@/lib/utils";
import { PremiumCard } from "@/app/cabinet/PremiumCard";
import { ADMIN_BTN, ADMIN_BTN_DANGER, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
import { ADMIN_PANEL_STATE_CENTER } from "@/lib/admin-surface-classes";
import { getAccessToken } from "@/lib/auth-client";
import { beginCabinetImpersonation } from "@/lib/cabinet-impersonation";

interface Transaction {
  id: string;
  amountKop: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
  linkSlug: string | null;
  paymentPageUrl: string | null;
}

interface UserDetailsResponse {
  user: {
    id: string;
    login: string;
    email: string | null;
    role: string;
    isBlocked: boolean;
    hasApiKey: boolean;
    payoutDailyLimitCount: number | null;
    payoutDailyLimitKop: number | null;
    payoutMonthlyLimitCount: number | null;
    payoutMonthlyLimitKop: number | null;
    autoConfirmPayouts: boolean;
    autoConfirmPayoutThresholdKop: number | null;
    createdAt: string;
    fullName: string | null;
    birthDate: string | null;
    establishment: string | null;
    verificationStatus?: string;
    verificationRejectionReason?: string | null;
    recoveryCodeword?: string | null;
    recoveryCodewordHashOnly?: boolean;
  };
  stats: {
    balanceKop: number;
    totalReceivedKop: number;
    transactionsCount: number;
    payoutsPendingCount: number;
  };
  transactions: Transaction[];
}

const CABINET_VIEW_ROLES = new Set(["RECIPIENT", "EMPLOYEE"]);

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params?.id;
  const [data, setData] = useState<UserDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutNewTabHint, setPayoutNewTabHint] = useState(false);
  const [limitsMessage, setLimitsMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(false);
  const [appliedMaxPerOpRub, setAppliedMaxPerOpRub] = useState<string | null>(null);
  const [editingMaxPerOp, setEditingMaxPerOp] = useState(false);
  const [inputMaxPerOpRub, setInputMaxPerOpRub] = useState("");
  const [loadingMaxPerOp, setLoadingMaxPerOp] = useState(false);
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
  const [loadingAutoConfirmToggle, setLoadingAutoConfirmToggle] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [displayApiKey, setDisplayApiKey] = useState<string | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [unverifyLoading, setUnverifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [cabinetViewLoading, setCabinetViewLoading] = useState(false);
  const [cabinetViewError, setCabinetViewError] = useState<string | null>(null);
  const [newRecoveryCodeword, setNewRecoveryCodeword] = useState("");
  const [newRecoveryCodewordConfirm, setNewRecoveryCodewordConfirm] = useState("");
  const [recoveryCodewordLoading, setRecoveryCodewordLoading] = useState(false);
  const [recoveryCodewordError, setRecoveryCodewordError] = useState<string | null>(null);
  const [recoveryCodewordOk, setRecoveryCodewordOk] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token || !userId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error("Ошибка загрузки");
        const json = (await res.json()) as UserDetailsResponse;
        setData(json);
        setDisplayApiKey(null);
        const u = json.user;
        setAutoConfirmEnabled(u.autoConfirmPayouts ?? false);
        if (u.autoConfirmPayoutThresholdKop != null) {
          const rub = String(Math.round(Number(u.autoConfirmPayoutThresholdKop) / 100));
          setAppliedMaxPerOpRub(rub);
          setInputMaxPerOpRub(rub);
        } else {
          setAppliedMaxPerOpRub(null);
          setInputMaxPerOpRub("");
        }
        if (u.payoutDailyLimitKop != null) {
          const rub = String(Math.round(Number(u.payoutDailyLimitKop) / 100));
          setAppliedDailyRub(rub);
          setInputDailyRub(rub);
        } else {
          setAppliedDailyRub(null);
          setInputDailyRub("");
        }
        if (u.payoutMonthlyLimitKop != null) {
          const rub = String(Math.round(Number(u.payoutMonthlyLimitKop) / 100));
          setAppliedMonthlyRub(rub);
          setInputMonthlyRub(rub);
        } else {
          setAppliedMonthlyRub(null);
          setInputMonthlyRub("");
        }
        if (u.payoutDailyLimitCount != null) {
          setAppliedDailyCount(String(u.payoutDailyLimitCount));
          setInputDailyCount(String(u.payoutDailyLimitCount));
        } else {
          setAppliedDailyCount(null);
          setInputDailyCount("");
        }
        if (u.payoutMonthlyLimitCount != null) {
          setAppliedMonthlyCount(String(u.payoutMonthlyLimitCount));
          setInputMonthlyCount(String(u.payoutMonthlyLimitCount));
        } else {
          setAppliedMonthlyCount(null);
          setInputMonthlyCount("");
        }
      })
      .catch(() => setError("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [userId]);

  const statusLabels: Record<string, string> = {
    PENDING: "В ожидании",
    SUCCESS: "Успешно",
    FAILED: "Ошибка",
    CANCELLED: "Отменено",
  };

  const handlePasswordReset = async () => {
    if (!userId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    if (!newPassword || newPassword !== newPasswordConfirm) {
      setPasswordError("Пароли не совпадают");
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordOk(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ newPassword, newPasswordConfirm }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setPasswordError(data.error ?? "Ошибка обновления пароля");
        return;
      }
      setPasswordOk(true);
      setNewPassword("");
      setNewPasswordConfirm("");
      setTimeout(() => setPasswordOk(false), 3000);
    } catch {
      setPasswordError("Ошибка соединения");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRecoveryCodewordSave = async () => {
    if (!userId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    if (!newRecoveryCodeword.trim() || newRecoveryCodeword !== newRecoveryCodewordConfirm) {
      setRecoveryCodewordError("Кодовые слова не совпадают или пусты");
      return;
    }
    if (newRecoveryCodeword.trim().length < 3) {
      setRecoveryCodewordError("Минимум 3 символа");
      return;
    }
    setRecoveryCodewordLoading(true);
    setRecoveryCodewordError(null);
    setRecoveryCodewordOk(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}/recovery-codeword`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
        body: JSON.stringify({
          recoveryCodeword: newRecoveryCodeword.trim(),
          recoveryCodewordConfirm: newRecoveryCodewordConfirm.trim(),
        }),
      });
      const body = (await res.json()) as { error?: string; success?: boolean; recoveryCodeword?: string };
      if (!res.ok) {
        setRecoveryCodewordError(body.error ?? "Ошибка сохранения");
        return;
      }
      if (body.success && body.recoveryCodeword != null) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                user: {
                  ...prev.user,
                  recoveryCodeword: body.recoveryCodeword!,
                  recoveryCodewordHashOnly: false,
                },
              }
            : prev,
        );
      }
      setRecoveryCodewordOk(true);
      setNewRecoveryCodeword("");
      setNewRecoveryCodewordConfirm("");
      setTimeout(() => setRecoveryCodewordOk(false), 3000);
    } catch {
      setRecoveryCodewordError("Ошибка соединения");
    } finally {
      setRecoveryCodewordLoading(false);
    }
  };

  const patchUser = async (payload: Record<string, unknown>) => {
    if (!userId) return null;
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...getCsrfHeader(),
      },
      body: JSON.stringify(payload),
    });
    const respData = await res.json();
    if (!res.ok) return (respData as { error?: string }).error ?? "Ошибка";
    if (respData && typeof respData === "object" && "id" in respData) {
      setData((prev) => (prev ? { ...prev, user: respData as UserDetailsResponse["user"] } : null));
    }
    return null;
  };

  const applyMaxPerOp = async () => {
    if (!userId) return;
    setLoadingMaxPerOp(true);
    setLimitsMessage(null);
    const rub = inputMaxPerOpRub.trim() === "" ? null : parseFloat(inputMaxPerOpRub.trim().replace(",", "."));
    if (inputMaxPerOpRub.trim() !== "" && (Number.isNaN(rub!) || (rub ?? 0) < 0)) {
      setLimitsMessage({ type: "err", text: "Введите корректную сумму (₽)" });
      setLoadingMaxPerOp(false);
      return;
    }
    const thresholdKop = rub != null && !Number.isNaN(rub) && rub >= 0 ? Math.round(rub * 100) : null;
    const err = await patchUser({ autoConfirmPayoutThresholdKop: thresholdKop });
    if (err) {
      setLimitsMessage({ type: "err", text: err });
    } else {
      const applied = inputMaxPerOpRub.trim() !== "" ? inputMaxPerOpRub.trim() : null;
      setAppliedMaxPerOpRub(applied);
      setInputMaxPerOpRub(applied ?? "");
      setEditingMaxPerOp(false);
      setLimitsMessage({ type: "ok", text: "Сохранено" });
    }
    setLoadingMaxPerOp(false);
  };

  const applyDailyRub = async () => {
    if (!userId) return;
    setLoadingDailyRub(true);
    setLimitsMessage(null);
    const rub = inputDailyRub.trim() === "" ? null : parseFloat(inputDailyRub.trim().replace(",", "."));
    if (inputDailyRub.trim() !== "" && (Number.isNaN(rub!) || (rub ?? 0) < 0)) {
      setLimitsMessage({ type: "err", text: "Введите корректную сумму (₽)" });
      setLoadingDailyRub(false);
      return;
    }
    const err = await patchUser({
      payoutDailyLimitKop: rub != null && !Number.isNaN(rub) ? Math.round(rub * 100) : null,
    });
    if (err) {
      setLimitsMessage({ type: "err", text: err });
    } else {
      const applied = inputDailyRub.trim() !== "" ? inputDailyRub.trim() : null;
      setAppliedDailyRub(applied);
      setInputDailyRub(applied ?? "");
      setEditingDailyRub(false);
      setLimitsMessage({ type: "ok", text: "Сохранено" });
    }
    setLoadingDailyRub(false);
  };

  const applyMonthlyRub = async () => {
    if (!userId) return;
    setLoadingMonthlyRub(true);
    setLimitsMessage(null);
    const rub = inputMonthlyRub.trim() === "" ? null : parseFloat(inputMonthlyRub.trim().replace(",", "."));
    if (inputMonthlyRub.trim() !== "" && (Number.isNaN(rub!) || (rub ?? 0) < 0)) {
      setLimitsMessage({ type: "err", text: "Введите корректную сумму (₽)" });
      setLoadingMonthlyRub(false);
      return;
    }
    const err = await patchUser({
      payoutMonthlyLimitKop: rub != null && !Number.isNaN(rub) ? Math.round(rub * 100) : null,
    });
    if (err) {
      setLimitsMessage({ type: "err", text: err });
    } else {
      const applied = inputMonthlyRub.trim() !== "" ? inputMonthlyRub.trim() : null;
      setAppliedMonthlyRub(applied);
      setInputMonthlyRub(applied ?? "");
      setEditingMonthlyRub(false);
      setLimitsMessage({ type: "ok", text: "Сохранено" });
    }
    setLoadingMonthlyRub(false);
  };

  const applyDailyCount = async () => {
    if (!userId) return;
    setLoadingDailyCount(true);
    setLimitsMessage(null);
    const count = inputDailyCount.trim() === "" ? null : parseInt(inputDailyCount.trim(), 10);
    if (inputDailyCount.trim() !== "" && (Number.isNaN(count!) || (count ?? 0) < 0 || (count ?? 0) > 100)) {
      setLimitsMessage({ type: "err", text: "Число от 0 до 100" });
      setLoadingDailyCount(false);
      return;
    }
    const err = await patchUser({ payoutDailyLimitCount: count ?? null });
    if (err) {
      setLimitsMessage({ type: "err", text: err });
    } else {
      const applied = inputDailyCount.trim() !== "" ? inputDailyCount.trim() : null;
      setAppliedDailyCount(applied);
      setInputDailyCount(applied ?? "");
      setEditingDailyCount(false);
      setLimitsMessage({ type: "ok", text: "Сохранено" });
    }
    setLoadingDailyCount(false);
  };

  const applyMonthlyCount = async () => {
    if (!userId) return;
    setLoadingMonthlyCount(true);
    setLimitsMessage(null);
    const count = inputMonthlyCount.trim() === "" ? null : parseInt(inputMonthlyCount.trim(), 10);
    if (inputMonthlyCount.trim() !== "" && (Number.isNaN(count!) || (count ?? 0) < 0 || (count ?? 0) > 3000)) {
      setLimitsMessage({ type: "err", text: "Число от 0 до 3000" });
      setLoadingMonthlyCount(false);
      return;
    }
    const err = await patchUser({ payoutMonthlyLimitCount: count ?? null });
    if (err) {
      setLimitsMessage({ type: "err", text: err });
    } else {
      const applied = inputMonthlyCount.trim() !== "" ? inputMonthlyCount.trim() : null;
      setAppliedMonthlyCount(applied);
      setInputMonthlyCount(applied ?? "");
      setEditingMonthlyCount(false);
      setLimitsMessage({ type: "ok", text: "Сохранено" });
    }
    setLoadingMonthlyCount(false);
  };

  const applyAutoConfirmToggle = async (enabled: boolean) => {
    if (!userId) return;
    setLoadingAutoConfirmToggle(true);
    setLimitsMessage(null);
    const err = await patchUser({
      autoConfirmPayouts: enabled,
      ...(enabled ? {} : { autoConfirmPayoutThresholdKop: null }),
    });
    if (err) {
      setLimitsMessage({ type: "err", text: err });
    } else {
      setAutoConfirmEnabled(enabled);
      if (!enabled) {
        setAppliedMaxPerOpRub(null);
        setInputMaxPerOpRub("");
      }
      setLimitsMessage({ type: "ok", text: "Сохранено" });
    }
    setLoadingAutoConfirmToggle(false);
  };

  const handlePayout = async () => {
    if (!userId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    const amountRub = parseFloat(payoutAmount);
    if (!amountRub || amountRub <= 0) {
      setPayoutError("Введите корректную сумму");
      return;
    }
    const amountKop = Math.round(amountRub * 100);
    if (amountKop < PAYOUT_MIN_AMOUNT_KOP || amountKop > PAYOUT_MAX_AMOUNT_KOP) {
      setPayoutError(
        `Сумма от ${(PAYOUT_MIN_AMOUNT_KOP / 100).toLocaleString("ru-RU")} до ${(PAYOUT_MAX_AMOUNT_KOP / 100).toLocaleString("ru-RU")} ₽`,
      );
      return;
    }
    setPayoutLoading(true);
    setPayoutError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sd-pay-out-page`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ amountKop }),
      });
      const data = (await res.json()) as {
        formUrl?: string;
        formFields?: Record<string, string>;
        error?: string;
        code?: string;
        description?: string;
      };
      if (!res.ok) {
        setPayoutError(data.error ?? data.description ?? "Ошибка вывода");
        return;
      }
      if (!data.formUrl || !data.formFields) {
        setPayoutError("Некорректный ответ сервера");
        return;
      }
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.formUrl;
      form.target = "_blank";
      form.style.display = "none";
      for (const [name, value] of Object.entries(data.formFields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      setPayoutNewTabHint(true);
      setTimeout(() => setPayoutNewTabHint(false), 8000);
      setPayoutAmount("");
      const profileRes = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const json = (await profileRes.json()) as UserDetailsResponse;
        setData(json);
        setDisplayApiKey(null);
      }
    } catch {
      setPayoutError("Ошибка соединения");
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!userId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setApiKeyLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/api-key`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setApiKeyLoading(false);
        return;
      }
      const { apiKey: newKey } = (await res.json()) as { apiKey: string };
      setDisplayApiKey(newKey);
      setData((prev) =>
        prev ? { ...prev, user: { ...prev.user, hasApiKey: true } } : null,
      );
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleCopyApiKey = () => {
    if (!displayApiKey) return;
    void navigator.clipboard.writeText(displayApiKey).then(() => {
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2500);
    });
  };

  const handleBlockToggle = async () => {
    if (!userId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setBlockLoading(true);
    setBlockError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ isBlocked: !data!.user.isBlocked }),
      });
      const respData = await res.json();
      if (!res.ok) {
        setBlockError((respData as { error?: string }).error ?? "Ошибка");
        setBlockLoading(false);
        return;
      }
      if (respData && typeof respData === "object" && "id" in respData) {
        setData((prev) => (prev ? { ...prev, user: respData as UserDetailsResponse["user"] } : null));
      }
    } catch {
      setBlockError("Ошибка соединения");
    } finally {
      setBlockLoading(false);
    }
  };

  const handleManualVerify = async () => {
    if (!userId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
      });
      const respData = await res.json();
      if (!res.ok) {
        setVerifyError((respData as { error?: string }).error ?? "Ошибка");
        setVerifyLoading(false);
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: { ...prev.user, verificationStatus: "VERIFIED", verificationRejectionReason: null },
            }
          : null,
      );
    } catch {
      setVerifyError("Ошибка соединения");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleUnverify = async () => {
    if (!userId) return;
    if (!window.confirm("Снять верификацию с этого пользователя?")) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setUnverifyLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/unverify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
      });
      const respData = await res.json();
      if (!res.ok) {
        setVerifyError((respData as { error?: string }).error ?? "Ошибка");
        setUnverifyLoading(false);
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: { ...prev.user, verificationStatus: "NONE", verificationRejectionReason: null },
            }
          : null,
      );
    } catch {
      setVerifyError("Ошибка соединения");
    } finally {
      setUnverifyLoading(false);
    }
  };

  const handleOpenUserCabinet = async () => {
    if (!userId) return;
    const adminToken = getAccessToken();
    if (!adminToken) return;
    setCabinetViewLoading(true);
    setCabinetViewError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/cabinet-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const body = (await res.json()) as { accessToken?: string; error?: string };
      if (!res.ok || !body.accessToken) {
        setCabinetViewError(body.error ?? "Не удалось открыть кабинет");
        return;
      }
      beginCabinetImpersonation(adminToken, body.accessToken, `/admin/users/${userId}`);
      router.push("/cabinet");
    } catch {
      setCabinetViewError("Ошибка соединения");
    } finally {
      setCabinetViewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={ADMIN_PANEL_STATE_CENTER}>
        <div className="text-center text-white/90">Загрузка…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={ADMIN_PANEL_STATE_CENTER}>
        <div className="max-w-md text-center text-white/90">{error || "Ошибка загрузки"}</div>
      </div>
    );
  }

  return (
    <div id="admin-user-detail" className="min-w-0 max-w-full">
      <div className="mb-6 mx-auto flex w-full max-w-4xl flex-col gap-3">
        <div className="cabinet-section-header w-full max-w-[360px] rounded-2xl border-0 px-4 pb-5 pt-3 sm:px-5">
          <div className="mb-3 flex justify-start">
            <Link
              href="/admin/users"
              className={`${ADMIN_BTN} admin-btn--neutral inline-flex w-fit gap-2 px-3 py-2 text-sm`}
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Link>
          </div>
          <div className="flex h-[120px] items-center justify-center gap-4">
            <UserRound className="h-12 w-12 shrink-0 text-white" />
            <div className="min-w-0 leading-tight">
              <div className="text-base font-semibold uppercase tracking-wide text-white">
                {data.user.login}
              </div>
              <div className="mt-1.5 text-sm text-white/80">
                {data.user.email || "—"}
              </div>
            </div>
          </div>
        </div>
        {blockError && <p className="text-sm text-white/90">{blockError}</p>}
        {verifyError && <p className="text-sm text-white/90">{verifyError}</p>}
        {cabinetViewError && <p className="text-sm text-amber-200/90">{cabinetViewError}</p>}
        <div className="flex w-full flex-row flex-wrap items-center justify-center gap-2 sm:gap-3">
          {CABINET_VIEW_ROLES.has(data.user.role) && (
            <button
              type="button"
              onClick={handleOpenUserCabinet}
              disabled={cabinetViewLoading || data.user.isBlocked}
              title={data.user.isBlocked ? "Нельзя открыть кабинет заблокированного пользователя" : undefined}
              className={`${ADMIN_BTN} gap-2 border border-[var(--color-brand-gold)]/35 bg-[var(--color-brand-gold)]/12 px-4 py-2.5 text-sm text-white hover:bg-[var(--color-brand-gold)]/20 disabled:opacity-50`}
            >
              <MonitorSmartphone className="h-4 w-4" />
              {cabinetViewLoading ? "Открытие…" : "Кабинет как пользователь"}
            </button>
          )}
          <button
            type="button"
            onClick={handleBlockToggle}
            disabled={blockLoading || unverifyLoading || verifyLoading}
            className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-2 px-4 py-2.5 text-sm disabled:opacity-50`}
          >
            {data.user.isBlocked ? (
              <>
                <Unlock className="h-4 w-4" />
                {blockLoading ? "Загрузка…" : "Разблокировать пользователя"}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                {blockLoading ? "Загрузка…" : "Заблокировать пользователя"}
              </>
            )}
          </button>
          {data.user.verificationStatus !== "VERIFIED" && (
            <button
              type="button"
              onClick={handleManualVerify}
              disabled={verifyLoading || unverifyLoading}
              className={`${ADMIN_BTN} gap-2 px-4 py-2.5 text-sm disabled:opacity-50`}
            >
              <ShieldCheck className="h-4 w-4" />
              {verifyLoading ? "Сохранение..." : "Подтвердить верификацию"}
            </button>
          )}
          {data.user.verificationStatus === "VERIFIED" && (
            <>
              <span className="inline-flex items-center gap-2 rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-2.5 text-sm font-medium text-green-400">
                <ShieldCheck className="h-4 w-4" />
                Верифицирован
              </span>
              <button
                type="button"
                onClick={handleUnverify}
                disabled={unverifyLoading || verifyLoading || blockLoading}
                className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} gap-2 px-4 py-2.5 text-sm disabled:opacity-50`}
              >
                <ShieldOff className="h-4 w-4" />
                {unverifyLoading ? "Сохранение..." : "Снять верификацию"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cabinet-section-header rounded-2xl border-0 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/90">Текущий баланс</p>
              <p className="mt-2 text-xl font-bold text-white">{formatMoneyCompact(data.stats.balanceKop)}</p>
            </div>
            <Wallet className="h-6 w-6 text-white/90" />
          </div>
        </div>
        <div className="cabinet-section-header rounded-2xl border-0 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/90">Всего получено</p>
              <p className="mt-2 text-xl font-bold text-white">{formatMoneyCompact(data.stats.totalReceivedKop)}</p>
            </div>
            <TrendingUp className="h-6 w-6 text-white/90" />
          </div>
        </div>
        <div className="cabinet-section-header rounded-2xl border-0 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/90">Транзакций</p>
              <p className="mt-2 text-xl font-bold text-white">
                {data.stats.transactionsCount.toLocaleString("ru-RU")}
              </p>
            </div>
            <ListChecks className="h-6 w-6 text-white/90" />
          </div>
        </div>
        <div className="cabinet-section-header rounded-2xl border-0 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/90">Ожидают вывода</p>
              <p className="mt-2 text-xl font-bold text-white/90">
                {data.stats.payoutsPendingCount.toLocaleString("ru-RU")}
              </p>
            </div>
            <Clock className="h-6 w-6 text-white/80" />
          </div>
        </div>
      </div>

      <div className="mb-8 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="cabinet-section-header min-w-0 overflow-hidden rounded-2xl border-0 p-6">
          <h2 className="text-center text-base font-semibold text-white">Анкета</h2>
          <dl className="mt-4 grid gap-3 text-sm text-white/90">
            <div className="flex justify-between gap-4">
              <dt className="text-white">Логин</dt>
              <dd className="text-white/90">{data.user.login}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white">Email</dt>
              <dd className="text-white/90">{data.user.email || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white">ФИО</dt>
              <dd className="text-white/90">{data.user.fullName || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white">Дата рождения</dt>
              <dd className="text-white/90">{data.user.birthDate || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white">Заведение</dt>
              <dd className="text-white/90">{data.user.establishment || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white">Роль</dt>
              <dd className="text-white/90">
                {data.user.role === "ADMIN"
                  ? "Администратор"
                  : data.user.role === "SUPERADMIN"
                    ? "Суперадмин"
                    : data.user.role === "ESTABLISHMENT_ADMIN"
                      ? "Управляющий заведения"
                      : data.user.role === "EMPLOYEE"
                        ? "Официант"
                        : "Получатель"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white">Статус</dt>
              <dd className="text-white/90">{data.user.isBlocked ? "Заблокирован" : "Активен"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white">Верификация</dt>
              <dd className="text-white/90">
                {data.user.verificationStatus === "VERIFIED"
                  ? "Верифицирован"
                  : data.user.verificationStatus === "PENDING"
                    ? "На рассмотрении"
                    : data.user.verificationStatus === "REJECTED"
                      ? `Отклонён${data.user.verificationRejectionReason ? `: ${data.user.verificationRejectionReason}` : ""}`
                      : "Не верифицирован"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white">Дата регистрации</dt>
              <dd className="text-white/90">{formatDate(data.user.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white">Пароль</dt>
              <dd className="text-white/90">Скрыт (хэш)</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white shrink-0">Кодовое слово</dt>
              <dd className="max-w-[min(100%,18rem)] break-words text-right text-white/90">
                {data.user.recoveryCodeword
                  ? data.user.recoveryCodeword
                  : data.user.recoveryCodewordHashOnly
                    ? "Задано (нет копии для отображения — задайте новое ниже)"
                    : "Не задано"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="cabinet-section-header min-w-0 overflow-hidden rounded-2xl border-0 p-6">
          <h2 className="text-center text-base font-semibold text-white">Смена пароля</h2>
          <p className="mt-2 text-sm text-white/80">
            Новый пароль будет установлен, и пользователь обязан сменить его при входе.
          </p>
          {passwordError && <p className="mt-3 text-sm text-white/90">{passwordError}</p>}
          {passwordOk && <p className="mt-3 text-sm text-white">Пароль обновлён</p>}
          <div className="mt-4 grid gap-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
              className="w-full rounded-xl border-0 bg-[var(--color-bg-sides)] px-4 py-2.5 text-[var(--color-text)] focus:outline-none"
            />
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="Повторите пароль"
              className="w-full rounded-xl border-0 bg-[var(--color-bg-sides)] px-4 py-2.5 text-[var(--color-text)] focus:outline-none"
            />
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={passwordLoading || !newPassword || !newPasswordConfirm}
              className={`relative z-10 ${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-2 px-5 py-2.5 text-sm disabled:opacity-60`}
            >
              {passwordLoading ? "Сохранение..." : "Обновить пароль"}
            </button>
          </div>
        </div>

        <div className="cabinet-section-header min-w-0 overflow-hidden rounded-2xl border-0 p-6">
          <div className="mb-2 flex items-center justify-center gap-2">
            <KeyRound className="h-5 w-5 shrink-0 text-[var(--color-accent-gold)]" aria-hidden />
            <h2 className="text-center text-base font-semibold text-white">Кодовое слово</h2>
          </div>
          <p className="text-center text-sm text-white/80">
            Для сброса пароля по почте. Сохраняется в виде хеша и зашифрованной копии для списков в админке.
          </p>
          {recoveryCodewordError && <p className="mt-3 text-sm text-white/90">{recoveryCodewordError}</p>}
          {recoveryCodewordOk && <p className="mt-3 text-sm text-white">Кодовое слово обновлено</p>}
          <div className="mt-4 grid gap-3">
            <input
              type="password"
              autoComplete="off"
              maxLength={72}
              value={newRecoveryCodeword}
              onChange={(e) => setNewRecoveryCodeword(e.target.value)}
              placeholder="Новое кодовое слово (от 3 символов)"
              className="w-full rounded-xl border-0 bg-[var(--color-bg-sides)] px-4 py-2.5 text-[var(--color-text)] focus:outline-none"
            />
            <input
              type="password"
              autoComplete="off"
              maxLength={72}
              value={newRecoveryCodewordConfirm}
              onChange={(e) => setNewRecoveryCodewordConfirm(e.target.value)}
              placeholder="Повторите кодовое слово"
              className="w-full rounded-xl border-0 bg-[var(--color-bg-sides)] px-4 py-2.5 text-[var(--color-text)] focus:outline-none"
            />
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleRecoveryCodewordSave}
              disabled={
                recoveryCodewordLoading || !newRecoveryCodeword.trim() || !newRecoveryCodewordConfirm.trim()
              }
              className={`relative z-10 ${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-2 px-5 py-2.5 text-sm disabled:opacity-60`}
            >
              {recoveryCodewordLoading ? "Сохранение..." : "Сохранить кодовое слово"}
            </button>
          </div>
        </div>

        <div className="cabinet-section-header min-w-0 rounded-2xl border-0 p-6 shadow-[var(--cabinet-shadow-subtle)]">
          <div className="mb-5 flex min-w-0 items-center justify-center gap-2">
            <Sliders className="h-5 w-5 shrink-0 text-[var(--color-accent-gold)]" aria-hidden />
            <h2 className="min-w-0 text-center text-lg font-semibold leading-tight text-white break-words">Лимиты и вывод</h2>
          </div>
          {limitsMessage && (
            <p className="mb-4 text-sm text-white/90">
              {limitsMessage.text}
            </p>
          )}
          <div className="space-y-4">
            {[
              {
                label: "1. Макс. сумма одной операции вывода",
                value: editingMaxPerOp ? inputMaxPerOpRub : (appliedMaxPerOpRub ?? ""),
                onChange: setInputMaxPerOpRub,
                readOnly: !editingMaxPerOp,
                placeholder: "сумма за 1 раз (₽)",
                inputType: "text",
                inputMode: "decimal",
                editing: editingMaxPerOp,
                loading: loadingMaxPerOp,
                onApply: applyMaxPerOp,
                onEdit: () => setEditingMaxPerOp(true),
              },
              {
                label: "2. Суточный лимит вывода",
                value: editingDailyRub ? inputDailyRub : (appliedDailyRub ?? ""),
                onChange: setInputDailyRub,
                readOnly: !editingDailyRub,
                placeholder: "сумма (₽)",
                inputType: "text",
                inputMode: "decimal",
                editing: editingDailyRub,
                loading: loadingDailyRub,
                onApply: applyDailyRub,
                onEdit: () => setEditingDailyRub(true),
              },
              {
                label: "3. Месячный лимит вывода",
                value: editingMonthlyRub ? inputMonthlyRub : (appliedMonthlyRub ?? ""),
                onChange: setInputMonthlyRub,
                readOnly: !editingMonthlyRub,
                placeholder: "сумма (₽)",
                inputType: "text",
                inputMode: "decimal",
                editing: editingMonthlyRub,
                loading: loadingMonthlyRub,
                onApply: applyMonthlyRub,
                onEdit: () => setEditingMonthlyRub(true),
              },
              {
                label: "4. Суточный лимит заявок",
                value: editingDailyCount ? inputDailyCount : (appliedDailyCount ?? ""),
                onChange: setInputDailyCount,
                readOnly: !editingDailyCount,
                placeholder: "заявок",
                inputType: "number",
                inputMode: undefined,
                editing: editingDailyCount,
                loading: loadingDailyCount,
                onApply: applyDailyCount,
                onEdit: () => setEditingDailyCount(true),
              },
              {
                label: "5. Месячный лимит заявок",
                value: editingMonthlyCount ? inputMonthlyCount : (appliedMonthlyCount ?? ""),
                onChange: setInputMonthlyCount,
                readOnly: !editingMonthlyCount,
                placeholder: "заявок",
                inputType: "number",
                inputMode: undefined,
                editing: editingMonthlyCount,
                loading: loadingMonthlyCount,
                onApply: applyMonthlyCount,
                onEdit: () => setEditingMonthlyCount(true),
              },
            ].map((row, idx) => (
              <div key={idx} className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 text-sm font-medium text-white sm:min-w-[200px]">
                  {row.label}
                </div>
                <div className="w-[8.5rem] shrink-0">
                  <input
                    type={row.inputType as "text" | "number"}
                    inputMode={row.inputType === "text" ? "decimal" : undefined}
                    readOnly={row.readOnly}
                    value={row.value}
                    onChange={(e) => row.onChange(e.target.value)}
                    placeholder={row.placeholder}
                    min={row.inputType === "number" ? 0 : undefined}
                    max={row.inputType === "number" ? (idx === 3 ? 100 : 3000) : undefined}
                    className="w-full rounded-lg border-0 bg-[var(--color-light-gray)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:bg-[var(--color-bg-sides)] disabled:bg-[var(--color-light-gray)] read-only:bg-[var(--color-light-gray)]"
                  />
                </div>
                {row.editing ? (
                  <button
                    type="button"
                    onClick={row.onApply}
                    disabled={row.loading}
                    className={`shrink-0 ${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} px-4 py-2 text-sm disabled:opacity-50`}
                  >
                    {row.loading ? "Применяем…" : "Применить"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={row.onEdit}
                    className={`shrink-0 ${ADMIN_BTN} admin-btn--neutral px-4 py-2 text-sm`}
                  >
                    Изменить
                  </button>
                )}
              </div>
            ))}
            <div className="flex min-w-0 flex-wrap items-center gap-3 border-0 pt-4">
              <div className="min-w-0 text-sm font-medium text-white">Авто-вывод</div>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="relative inline-block h-6 w-10 shrink-0 rounded-full bg-black/30 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:content-[''] after:transition-transform focus-within:ring-2 focus-within:ring-white/30 focus-within:ring-offset-2 has-[:checked]:bg-[var(--color-brand-gold)] has-[:checked]:after:translate-x-4">
                  <input
                    type="checkbox"
                    checked={autoConfirmEnabled}
                    onChange={(e) => applyAutoConfirmToggle(e.target.checked)}
                    disabled={loadingAutoConfirmToggle}
                    className="sr-only"
                  />
                </span>
                <span className="text-xs text-white/90 sm:text-sm">Включить автоподтверждение заявок до макс. суммы одной операции</span>
              </label>
            </div>
          </div>
        </div>

        <div className="cabinet-section-header min-w-0 rounded-2xl border-0 p-6">
          <div className="mb-4 flex min-w-0 items-center justify-center gap-2">
            <Send className="h-5 w-5 shrink-0 text-[var(--color-accent-gold)]" />
            <h2 className="min-w-0 text-center text-base font-semibold text-white">Вывести средства</h2>
          </div>
          {payoutError && <p className="mb-3 text-sm text-white/90">{payoutError}</p>}
          {payoutNewTabHint && (
            <p className="mb-3 text-sm text-[var(--color-brand-gold)]">
              Открыта новая вкладка — введите данные карты официанта на странице Paygine. После завершения заявка обновится.
            </p>
          )}
          <div className="grid gap-3">
            <input
              type="number"
              step="0.01"
              min="100"
              max="100000"
              value={payoutAmount}
              onChange={(e) => { setPayoutAmount(e.target.value); setPayoutError(null); }}
              placeholder="Сумма (₽), от 100 до 100 000"
              className="w-full rounded-xl border-0 bg-[var(--color-bg-sides)] px-4 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none"
            />
          </div>
            <button
              type="button"
              onClick={handlePayout}
              disabled={payoutLoading || !payoutAmount || parseFloat(payoutAmount) < 100}
              className={`relative z-10 mt-4 w-full ${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} px-5 py-2.5 text-sm disabled:opacity-60`}
            >
              {payoutLoading ? "Открываем Paygine…" : "Вывести на карту (страница Paygine)"}
            </button>
          <p className="mt-2 text-xs text-white/80">Откроется страница Paygine для ввода номера карты официанта</p>
          <div className="mt-6 w-full max-w-[320px] mx-auto">
            <PremiumCard
              fullName={data.user.fullName}
              balanceKop={data.stats.balanceKop}
              compact
            />
          </div>
        </div>
      </div>

      <div className="cabinet-section-header mb-8 min-w-0 overflow-hidden rounded-2xl border-0 p-4 sm:p-6">
        <h2 className="mb-4 flex min-w-0 items-center justify-center gap-2 text-base font-semibold text-white">
          <Key className="h-5 w-5 shrink-0 text-[var(--color-accent-gold)]" />
          API-ключ
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 rounded-xl border-0 bg-[var(--color-light-gray)] px-4 py-2.5 font-mono text-sm text-[#0a192f]">
            {displayApiKey ? (
              <span className="truncate block">{displayApiKey}</span>
            ) : data.user.hasApiKey ? (
              <span className="text-[var(--color-text-secondary)]">••••••••••••••••</span>
            ) : (
              <span className="text-[var(--color-text-secondary)]">Не создан</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleRegenerateApiKey}
            disabled={apiKeyLoading}
            className={`${ADMIN_BTN} admin-btn--neutral gap-2 px-4 py-2.5 text-sm disabled:opacity-50`}
          >
            <RotateCw className={`h-4 w-4 ${apiKeyLoading ? "animate-spin" : ""}`} />
            {apiKeyLoading ? "Создание…" : data.user.hasApiKey ? "Обновить ключ" : "Создать ключ"}
          </button>
          {displayApiKey && (
            <button
              type="button"
              onClick={handleCopyApiKey}
              className={`${ADMIN_BTN} admin-btn--neutral gap-2 px-4 py-2.5 text-sm`}
            >
              <Copy className="h-4 w-4" />
              {apiKeyCopied ? "Код скопирован" : "Копировать"}
            </button>
          )}
        </div>
      </div>

      <div className="cabinet-section-header min-w-0 overflow-hidden rounded-2xl border-0">
        <div className="border-0 px-5 py-4">
          <h2 className="text-center text-base font-semibold text-white">История пополнений</h2>
        </div>
        {data.transactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/90">Записей не найдено</div>
        ) : (
          <>
            {/* Мобильная версия: карточки */}
            <div className="space-y-3 px-4 pb-4 lg:hidden">
              {data.transactions.map((tx) => (
                <div key={tx.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white">{formatMoneyCompact(tx.amountKop)}</span>
                    <span className="text-sm text-white/80">{statusLabels[tx.status]}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/70">{formatDate(tx.createdAt)}</p>
                  <p className="mt-1 truncate text-sm text-white/80">
                    {tx.paymentPageUrl ? (
                      <a href={tx.paymentPageUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-gold)] hover:underline">
                        {tx.linkSlug ?? "Страница"}
                      </a>
                    ) : (
                      tx.linkSlug ?? "—"
                    )}
                  </p>
                </div>
              ))}
            </div>
            {/* Десктоп: таблица */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[560px] text-white">
                <thead className="border-0 bg-white/10">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-white">ID</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-white">Сумма</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-white">Статус</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-white">Офик / страница</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-white">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <tr key={tx.id} className="border-0 hover:bg-[var(--color-brand-gold)]/15 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-white/90">{tx.id.slice(0, 8)}...</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-white/90">{formatMoneyCompact(tx.amountKop)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-white/90">{statusLabels[tx.status]}</td>
                      <td className="px-4 py-3 text-sm text-white/90">
                        {tx.paymentPageUrl ? (
                          <a href={tx.paymentPageUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-gold)] hover:underline">
                            {tx.linkSlug ?? tx.paymentPageUrl}
                          </a>
                        ) : (
                          tx.linkSlug ?? "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-white/90">{formatDate(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
