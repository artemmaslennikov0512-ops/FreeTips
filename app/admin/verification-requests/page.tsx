"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Download, Loader2, FileCheck } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { apiStatusForTab, type AdminRequestTab } from "./AdminStatusTabs";
type AdminRequestsMainTab = "verification" | "connection";
import { AdminConnectionRequestsBlock } from "./AdminConnectionRequestsBlock";
import { notifyAdminRequestsCountsChanged } from "@/lib/admin-requests-counts-sync";
import {
  ADMIN_BTN,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_NEUTRAL_SM,
  ADMIN_BTN_SUCCESS,
} from "@/lib/admin-button-classes";
import { ADMIN_PANEL_CARD, ADMIN_PANEL_PAGE_WIDE, ADMIN_PANEL_STATE_CENTER_COMPACT } from "@/lib/admin-surface-classes";
import {
  mainTabNewPending,
  readMainTabAckConnection,
  readMainTabAckVerification,
  writeMainTabAckConnection,
  writeMainTabAckVerification,
} from "@/lib/admin-requests-main-tab-ack";

interface VerificationRequestItem {
  id: string;
  userId: string;
  fullName: string;
  birthDate: string;
  passportSeries: string;
  passportNumber: string;
  inn: string;
  createdAt: string;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  login: string;
  email: string | null;
  uniqueId: number;
  hasPassportMain: boolean;
  hasPassportSpread: boolean;
}

type SectionCounts = { pending: number; approved: number; rejected: number };

type RequestsCountsPayload = {
  verification: SectionCounts;
  connection: SectionCounts;
  totalPending: number;
};

const DOC_LABELS: Record<string, string> = {
  passport_main: "Главное фото паспорта",
  passport_spread: "Разворот",
};

const ZERO_COUNTS: SectionCounts = { pending: 0, approved: 0, rejected: 0 };

function MainRequestsTabBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      className="ml-2 inline-flex min-h-[1.35rem] min-w-[1.35rem] shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-red)] px-2 text-xs font-bold leading-none text-white tabular-nums ring-2 ring-black/25"
      title={`Новых на рассмотрении: ${n}`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

function StatusSubTabBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-[11px] font-bold leading-none text-white tabular-nums">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function AdminVerificationRequestsPage() {
  const [mainTab, setMainTab] = useState<AdminRequestsMainTab>("verification");
  const [verificationTab, setVerificationTab] = useState<AdminRequestTab>("pending");
  const [connectionTab, setConnectionTab] = useState<AdminRequestTab>("pending");
  const [counts, setCounts] = useState<RequestsCountsPayload | null>(null);
  const [list, setList] = useState<VerificationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; login: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  /** Снимок pending с момента последнего «просмотра» главной вкладки (sessionStorage + state). */
  const [storedAckVerification, setStoredAckVerification] = useState<number | undefined>(undefined);
  const [storedAckConnection, setStoredAckConnection] = useState<number | undefined>(undefined);

  const fetchCounts = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const res = await fetch("/api/admin/requests-counts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as RequestsCountsPayload;
      setCounts(data);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshCountsAndNotifyLayout = useCallback(async () => {
    await fetchCounts();
    notifyAdminRequestsCountsChanged();
  }, [fetchCounts]);

  const fetchList = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const status = apiStatusForTab(verificationTab);
      const res = await fetch(`/api/admin/verification-requests?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError("Ошибка загрузки заявок");
        return;
      }
      const data = (await res.json()) as { requests: VerificationRequestItem[] };
      setList(data.requests ?? []);
    } catch {
      setError("Ошибка загрузки заявок");
    } finally {
      setLoading(false);
    }
  }, [verificationTab]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    setStoredAckVerification(readMainTabAckVerification());
    setStoredAckConnection(readMainTabAckConnection());
  }, []);

  useEffect(() => {
    if (mainTab !== "verification" || counts == null) return;
    const p = counts.verification.pending;
    writeMainTabAckVerification(p);
    setStoredAckVerification(p);
  }, [mainTab, counts]);

  useEffect(() => {
    if (mainTab !== "connection" || counts == null) return;
    const p = counts.connection.pending;
    writeMainTabAckConnection(p);
    setStoredAckConnection(p);
  }, [mainTab, counts]);

  useEffect(() => {
    if (mainTab !== "verification") return;
    fetchList();
  }, [fetchList, mainTab]);

  const handleApprove = async (id: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setApprovingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/verification-requests/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...getCsrfHeader(),
        },
        body: "{}",
      });
      if (res.ok) {
        await fetchList();
        await refreshCountsAndNotifyLayout();
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Ошибка подтверждения");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setRejectSubmitting(true);
    setRejectError(null);
    try {
      const res = await fetch(`/api/admin/verification-requests/${rejectModal.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setRejectModal(null);
        setRejectReason("");
        await fetchList();
        await refreshCountsAndNotifyLayout();
      } else {
        setRejectError(body.error ?? "Ошибка отклонения");
      }
    } catch {
      setRejectError("Ошибка соединения");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const downloadDoc = async (requestId: string, type: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    const key = `${requestId}-${type}`;
    setDownloading(key);
    try {
      const res = await fetch(`/api/admin/verification-requests/${requestId}/documents/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  const isPending = verificationTab === "pending";
  const emptyMessage =
    verificationTab === "pending"
      ? "Нет заявок на рассмотрении"
      : verificationTab === "approved"
        ? "Нет принятых заявок"
        : "Нет отклонённых заявок";

  const vCounts = counts?.verification ?? ZERO_COUNTS;
  const cCounts = counts?.connection ?? ZERO_COUNTS;
  const mainTabNewVerification = mainTabNewPending(vCounts.pending, storedAckVerification);
  const mainTabNewConnection = mainTabNewPending(cCounts.pending, storedAckConnection);

  const tabBtn = (active: boolean) =>
    `inline-flex items-center rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-white/15 text-white border border-b-0 border-white/20"
        : "text-white/70 hover:bg-white/10 hover:text-white border border-transparent"
    }`;

  const tableWrapClass =
    "admin-dashboard-table cabinet-section-header mt-0 w-full overflow-x-auto rounded-xl border-0 text-left";

  const activeStatusTab = mainTab === "verification" ? verificationTab : connectionTab;
  const setActiveStatusTab = mainTab === "verification" ? setVerificationTab : setConnectionTab;
  const subCounts = mainTab === "verification" ? vCounts : cCounts;

  const STATUS_TAB_ROWS: { key: AdminRequestTab; label: string }[] = [
    { key: "pending", label: "На рассмотрении" },
    { key: "approved", label: "Принятые" },
    { key: "rejected", label: "Отклонённые" },
  ];

  return (
    <div className={ADMIN_PANEL_PAGE_WIDE}>
      <div className="flex flex-col items-center gap-3">
        <FileCheck className="h-9 w-9 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
        <h1 className="text-center font-[family:var(--font-playfair)] text-2xl font-semibold text-white">Заявки</h1>
      </div>

      <div className={`${ADMIN_PANEL_CARD} !text-left`}>
        <p className="mb-3 text-sm font-medium text-white">Текущие заявки</p>

        <div className="flex flex-wrap gap-1 border-b border-white/15 pb-px">
          <button
            type="button"
            className={tabBtn(mainTab === "verification")}
            onClick={() => setMainTab("verification")}
          >
            <span>Вериф. официантов</span>
            <MainRequestsTabBadge n={mainTabNewVerification} />
          </button>
          <button
            type="button"
            className={tabBtn(mainTab === "connection")}
            onClick={() => setMainTab("connection")}
          >
            <span>Заявки на подкл.</span>
            <MainRequestsTabBadge n={mainTabNewConnection} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-white/15 pb-px">
          {STATUS_TAB_ROWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={tabBtn(activeStatusTab === key)}
              onClick={() => setActiveStatusTab(key)}
            >
              <span>{label}</span>
              {key === "pending" && subCounts.pending > 0 && <StatusSubTabBadge n={subCounts.pending} />}
            </button>
          ))}
        </div>

        {mainTab === "verification" && (
          <>
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
                {error}
              </div>
            )}
            {loading ? (
              <div className={`${ADMIN_PANEL_STATE_CENTER_COMPACT} py-10 text-white/60`}>
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              </div>
            ) : (
              <div className={tableWrapClass}>
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/15">
                      <th className="px-3 py-2 text-left font-medium text-white">Дата</th>
                      <th className="px-3 py-2 text-left font-medium text-white">Пользователь</th>
                      <th className="px-3 py-2 text-left font-medium text-white">ФИО</th>
                      <th className="px-3 py-2 text-left font-medium text-white">Паспорт / ИНН</th>
                      {!isPending && <th className="px-3 py-2 text-left font-medium text-white">Рассмотрено</th>}
                      {verificationTab === "rejected" && (
                        <th className="min-w-[140px] px-3 py-2 text-left font-medium text-white">Причина отказа</th>
                      )}
                      <th className="px-3 py-2 text-left font-medium text-white">Документы</th>
                      {isPending && <th className="px-3 py-2 text-left font-medium text-white">Действия</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-6 text-center text-white/60"
                        >
                          {emptyMessage}
                        </td>
                      </tr>
                    ) : (
                      list.map((r) => (
                        <tr key={r.id} className="border-b border-white/10">
                          <td className="whitespace-nowrap px-3 py-2.5 text-white">
                            {new Date(r.createdAt).toLocaleString("ru-RU")}
                          </td>
                          <td className="px-3 py-2.5">
                            <Link href={`/admin/users/${r.userId}`} className="text-[var(--color-brand-gold)] hover:underline">
                              {r.login}
                            </Link>
                            {r.email && <div className="text-xs text-white/80">{r.email}</div>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-white">{r.fullName}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-white">
                            {r.passportSeries} {r.passportNumber}, ИНН {r.inn}
                          </td>
                          {!isPending && (
                            <td className="whitespace-nowrap px-3 py-2.5 text-white/80">
                              {r.reviewedAt ? new Date(r.reviewedAt).toLocaleString("ru-RU") : "—"}
                            </td>
                          )}
                          {verificationTab === "rejected" && (
                            <td className="max-w-[220px] px-3 py-2.5 text-xs text-red-200/90">{r.rejectionReason ?? "—"}</td>
                          )}
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-2">
                              {(["passport_main", "passport_spread"] as const).map((type) => {
                                const has =
                                  type === "passport_main" ? r.hasPassportMain : r.hasPassportSpread;
                                const key = `${r.id}-${type}`;
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => has && downloadDoc(r.id, type)}
                                    disabled={!has || downloading === key}
                                    className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1 font-medium disabled:opacity-50`}
                                  >
                                    {downloading === key ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Download className="h-3 w-3" />
                                    )}
                                    {DOC_LABELS[type]}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          {isPending && (
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApprove(r.id)}
                                  disabled={approvingId === r.id}
                                  className={`${ADMIN_BTN} ${ADMIN_BTN_SUCCESS} gap-1 px-3 py-1.5 text-sm disabled:opacity-50`}
                                >
                                  {approvingId === r.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                  Подтвердить
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectModal({ id: r.id, login: r.login });
                                    setRejectReason("");
                                    setRejectError(null);
                                  }}
                                  className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} gap-1 px-3 py-1.5 text-sm`}
                                >
                                  <X className="h-4 w-4" />
                                  Отклонить
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {mainTab === "connection" && (
          <AdminConnectionRequestsBlock
            connectionCounts={cCounts}
            onAfterMutation={refreshCountsAndNotifyLayout}
            hideStatusTabs
            statusTab={connectionTab}
            onStatusTabChange={setConnectionTab}
            compactTableLayout
          />
        )}
      </div>

      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="reject-modal-content flex w-full max-w-md flex-col items-center rounded-2xl border border-white/10 bg-[var(--color-navy)] p-6 text-center shadow-xl">
            <h2 id="reject-modal-title" className="mb-4 w-full text-center text-lg font-semibold text-white">
              Отклонить заявку ({rejectModal.login})
            </h2>
            <p className="mb-4 w-full text-center text-sm text-white/80">
              Укажите причину отказа. Клиент увидит этот текст в личном кабинете.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Например: Нечитаемое фото паспорта. Загрузите чёткое изображение главной страницы."
              className="reject-modal-textarea mb-4 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]"
              rows={4}
            />
            {rejectError && <p className="reject-modal-error-msg mb-2 w-full text-center text-sm text-red-400">{rejectError}</p>}
            <div className="reject-modal-actions flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                  setRejectError(null);
                }}
                className={`${ADMIN_BTN} admin-btn--neutral px-4 py-2`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || rejectSubmitting}
                className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} px-4 py-2`}
              >
                {rejectSubmitting ? "Отправка…" : "Отклонить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
