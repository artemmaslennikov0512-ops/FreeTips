"use client";

import { useCallback, useEffect, useState } from "react";
import { useMobileDarkChromeOverlay } from "@/lib/use-mobile-dark-chrome-overlay";
import Link from "next/link";
import { Check, X, Download, Loader2, FolderArchive } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth-client";
import { AdminStatusTabs, apiStatusForTab, type AdminRequestTab } from "./AdminStatusTabs";
import { AdminRequestsMainTabs, type AdminRequestsMainTab } from "./AdminRequestsMainTabs";
import { AdminConnectionRequestsBlock } from "./AdminConnectionRequestsBlock";
import { notifyAdminRequestsCountsChanged } from "@/lib/admin-requests-counts-sync";
import {
  ADMIN_BTN,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_NEUTRAL_SM,
  ADMIN_BTN_SUCCESS,
} from "@/lib/admin-button-classes";
import { ADMIN_PANEL_CARD, ADMIN_PANEL_TEXTAREA } from "@/lib/admin-surface-classes";
import {
  PANEL_ADMIN_DASHBOARD_TABLE_CARD,
  PANEL_ADMIN_DASHBOARD_TABLE_DESKTOP,
  PANEL_PAGE_TITLE_ADMIN_CENTERED,
} from "@/lib/panel-shell-visual-classes";
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
  waiterCode: string;
  hasPassportSpread: boolean;
  hasSelfie: boolean;
  hasPassportMain: boolean;
}

type SectionCounts = { pending: number; approved: number; rejected: number };

type RequestsCountsPayload = {
  verification: SectionCounts;
  connection: SectionCounts;
  totalPending: number;
};

const DOC_LABELS: Record<string, string> = {
  passport_spread: "Паспорт (разворот)",
  selfie: "Селфи",
  passport_main: "Паспорт (лицо)",
};

const DOC_TYPES = ["passport_spread", "selfie", "passport_main"] as const;

function hasDoc(r: VerificationRequestItem, type: (typeof DOC_TYPES)[number]): boolean {
  if (type === "passport_spread") return r.hasPassportSpread;
  if (type === "selfie") return r.hasSelfie;
  return r.hasPassportMain;
}

const ZERO_COUNTS: SectionCounts = { pending: 0, approved: 0, rejected: 0 };

function ruPendingRequestsWord(n: number): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "заявка";
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return "заявки";
  return "заявок";
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
  /** Базовый pending после последнего решения по заявке (не при открытии вкладки). */
  const [storedAckVerification, setStoredAckVerification] = useState<number | undefined>(undefined);
  const [storedAckConnection, setStoredAckConnection] = useState<number | undefined>(undefined);

  useMobileDarkChromeOverlay(rejectModal !== null);

  const fetchCounts = useCallback(async (): Promise<RequestsCountsPayload | null> => {
    try {
      const res = await fetchWithAuth("/api/admin/requests-counts");
      if (!res.ok) return null;
      const data = (await res.json()) as RequestsCountsPayload;
      setCounts(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const refreshCountsAndNotifyLayout = useCallback(async (): Promise<RequestsCountsPayload | null> => {
    const data = await fetchCounts();
    notifyAdminRequestsCountsChanged();
    return data;
  }, [fetchCounts]);

  const onAfterConnectionMutation = useCallback(async () => {
    const data = await refreshCountsAndNotifyLayout();
    if (data) {
      writeMainTabAckConnection(data.connection.pending);
      setStoredAckConnection(data.connection.pending);
    }
  }, [refreshCountsAndNotifyLayout]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = apiStatusForTab(verificationTab);
      const res = await fetchWithAuth(`/api/admin/verification-requests?status=${status}`);
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
    if (mainTab !== "verification") return;
    fetchList();
  }, [fetchList, mainTab]);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/admin/verification-requests/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (res.ok) {
        await fetchList();
        const data = await refreshCountsAndNotifyLayout();
        if (data) {
          writeMainTabAckVerification(data.verification.pending);
          setStoredAckVerification(data.verification.pending);
        }
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
    setRejectSubmitting(true);
    setRejectError(null);
    try {
      const res = await fetchWithAuth(`/api/admin/verification-requests/${rejectModal.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setRejectModal(null);
        setRejectReason("");
        await fetchList();
        const data = await refreshCountsAndNotifyLayout();
        if (data) {
          writeMainTabAckVerification(data.verification.pending);
          setStoredAckVerification(data.verification.pending);
        }
      } else {
        setRejectError(body.error ?? "Ошибка отклонения");
      }
    } catch {
      setRejectError("Ошибка соединения");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const downloadDoc = async (requestId: string, type: string, waiterCode: string) => {
    const key = `${requestId}-${type}`;
    setDownloading(key);
    try {
      const res = await fetchWithAuth(`/api/admin/verification-requests/${requestId}/documents/${type}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let filename = `${waiterCode}-${type}.jpg`;
      const cd = res.headers.get("Content-Disposition");
      const m = /filename="([^"]+)"/.exec(cd ?? "");
      if (m?.[1]) filename = m[1];
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      await fetchList();
    } finally {
      setDownloading(null);
    }
  };

  const downloadZipBundle = async (requestId: string, waiterCode: string) => {
    const key = `zip-${requestId}`;
    setDownloading(key);
    try {
      const res = await fetchWithAuth(`/api/admin/verification-requests/${requestId}/documents/zip`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let filename = `${waiterCode}-verification.zip`;
      const cd = res.headers.get("Content-Disposition");
      const m = /filename="([^"]+)"/.exec(cd ?? "");
      if (m?.[1]) filename = m[1];
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      await fetchList();
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

  const activeStatusTab = mainTab === "verification" ? verificationTab : connectionTab;
  const setActiveStatusTab = mainTab === "verification" ? setVerificationTab : setConnectionTab;
  const statusBadges: Partial<Record<AdminRequestTab, number>> =
    mainTab === "verification"
      ? { pending: vCounts.pending, approved: vCounts.approved, rejected: vCounts.rejected }
      : { pending: cCounts.pending, approved: cCounts.approved, rejected: cCounts.rejected };

  return (
    <div className="w-full min-w-0 space-y-6 text-center text-white">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className={PANEL_PAGE_TITLE_ADMIN_CENTERED}>Заявки</h1>
        <AdminRequestsMainTabs
          value={mainTab}
          onChange={setMainTab}
          pendingVerification={mainTabNewVerification}
          pendingConnection={mainTabNewConnection}
          className="pt-1"
        />
        <div
          role="separator"
          aria-hidden="true"
          className="h-px w-full max-w-2xl shrink-0 bg-[var(--color-brand-gold)]/35"
        />
      </div>

      <div
        className={`${ADMIN_PANEL_CARD} !text-left flex w-full min-w-0 flex-col gap-4 min-h-0 lg:min-h-[min(62dvh,680px)]`}
      >
        <AdminStatusTabs
          align="start"
          value={activeStatusTab}
          onChange={setActiveStatusTab}
          badges={statusBadges}
        />

        {mainTab === "verification" && (
          <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
                {error}
              </div>
            )}
            {loading ? (
              <div className="flex min-h-[min(40dvh,360px)] flex-1 flex-col items-center justify-center text-white/60">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              </div>
            ) : list.length === 0 ? (
              <div className="flex min-h-[min(36dvh,280px)] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/60">
                <p>{emptyMessage}</p>
                {counts != null &&
                  verificationTab === "pending" &&
                  vCounts.pending === 0 &&
                  cCounts.pending > 0 && (
                    <p className="max-w-md text-white/75">
                      Счётчик в меню «Заявки» учитывает и подключения заведений: сейчас на рассмотрении{" "}
                      <span className="tabular-nums font-medium text-white">{cCounts.pending}</span>{" "}
                      {ruPendingRequestsWord(cCounts.pending)} в разделе{" "}
                      <button
                        type="button"
                        onClick={() => setMainTab("connection")}
                        className="text-[var(--color-brand-gold)] underline decoration-[var(--color-brand-gold)]/50 underline-offset-2 hover:decoration-[var(--color-brand-gold)]"
                      >
                        Заявки на подключение
                      </button>
                      .
                    </p>
                  )}
              </div>
            ) : (
              <>
                <div className="space-y-4 lg:hidden">
                  {list.map((r) => (
                    <div
                      key={r.id}
                      className={PANEL_ADMIN_DASHBOARD_TABLE_CARD}
                    >
                      <p className="text-xs text-white/60">
                        {new Date(r.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-2 min-w-0">
                        <Link
                          href={`/admin/users/${r.userId}`}
                          className="break-words font-medium text-[var(--color-brand-gold)] hover:underline"
                        >
                          {r.login}
                        </Link>
                        {r.email && <p className="mt-0.5 break-all text-sm text-white/75">{r.email}</p>}
                      </div>
                      <p className="mt-2 break-words text-sm font-medium text-white">{r.fullName}</p>
                      <p className="mt-1 break-words text-xs text-white/80">Дата рождения: {r.birthDate}</p>
                      <p className="mt-0.5 break-words text-xs text-white/80">
                        Паспорт: {r.passportSeries} {r.passportNumber}
                      </p>
                      {r.inn ? (
                        <p className="mt-0.5 break-words text-xs text-white/80">ИНН: {r.inn}</p>
                      ) : null}
                      {verificationTab === "rejected" && (
                        <p className="mt-2 rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-xs leading-snug text-red-200/90">
                          {r.rejectionReason ?? "—"}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                        {DOC_TYPES.map((type) => {
                          const has = hasDoc(r, type);
                          const key = `${r.id}-${type}`;
                          const code = r.waiterCode ?? String(r.uniqueId);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => has && downloadDoc(r.id, type, code)}
                              disabled={!has || downloading === key}
                              className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1 text-xs font-medium disabled:opacity-50`}
                            >
                              {downloading === key ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3 shrink-0" />
                              )}
                              {DOC_LABELS[type]}
                            </button>
                          );
                        })}
                        {(r.hasPassportSpread || r.hasSelfie || r.hasPassportMain) && (
                          <button
                            type="button"
                            onClick={() => downloadZipBundle(r.id, r.waiterCode ?? String(r.uniqueId))}
                            disabled={downloading === `zip-${r.id}`}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1 text-xs font-medium disabled:opacity-50`}
                          >
                            {downloading === `zip-${r.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FolderArchive className="h-3 w-3 shrink-0" />
                            )}
                            Папка ZIP ({r.waiterCode ?? r.uniqueId})
                          </button>
                        )}
                      </div>
                      {isPending && (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleApprove(r.id)}
                            disabled={approvingId === r.id}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_SUCCESS} flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-sm disabled:opacity-50 sm:w-auto sm:flex-1`}
                          >
                            {approvingId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 shrink-0" />
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
                            className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-sm sm:w-auto sm:flex-1`}
                          >
                            <X className="h-4 w-4 shrink-0" />
                            Отклонить
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className={PANEL_ADMIN_DASHBOARD_TABLE_DESKTOP}>
                  <div className="min-w-0 overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-white/15">
                          <th className="px-3 py-2 text-left font-medium text-white">Дата</th>
                          <th className="px-3 py-2 text-left font-medium text-white">Пользователь</th>
                          <th className="px-3 py-2 text-left font-medium text-white">ФИО</th>
                          <th className="px-3 py-2 text-left font-medium text-white">Д. рожд. / паспорт / ИНН</th>
                          {verificationTab === "rejected" && (
                            <th className="min-w-[140px] px-3 py-2 text-left font-medium text-white">Причина отказа</th>
                          )}
                          <th className="px-3 py-2 text-left font-medium text-white">Документы</th>
                          {isPending && <th className="px-3 py-2 text-left font-medium text-white">Действия</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => (
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
                            <td className="whitespace-nowrap px-3 py-2.5 text-white/90">
                              <div className="text-xs leading-snug">
                                <p>{r.birthDate}</p>
                                <p className="mt-0.5">
                                  {r.passportSeries} {r.passportNumber}
                                </p>
                                {r.inn ? <p className="mt-0.5">ИНН: {r.inn}</p> : null}
                              </div>
                            </td>
                            {verificationTab === "rejected" && (
                              <td className="max-w-[220px] px-3 py-2.5 text-xs text-red-200/90">{r.rejectionReason ?? "—"}</td>
                            )}
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-2">
                                {DOC_TYPES.map((type) => {
                                  const has = hasDoc(r, type);
                                  const key = `${r.id}-${type}`;
                                  const code = r.waiterCode ?? String(r.uniqueId);
                                  return (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => has && downloadDoc(r.id, type, code)}
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
                                {(r.hasPassportSpread || r.hasSelfie || r.hasPassportMain) && (
                                  <button
                                    type="button"
                                    onClick={() => downloadZipBundle(r.id, r.waiterCode ?? String(r.uniqueId))}
                                    disabled={downloading === `zip-${r.id}`}
                                    className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1 font-medium disabled:opacity-50`}
                                  >
                                    {downloading === `zip-${r.id}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <FolderArchive className="h-3 w-3" />
                                    )}
                                    ZIP ({r.waiterCode ?? r.uniqueId})
                                  </button>
                                )}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {mainTab === "connection" && (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <AdminConnectionRequestsBlock
              connectionCounts={cCounts}
              onAfterMutation={onAfterConnectionMutation}
              hideStatusTabs
              statusTab={connectionTab}
              onStatusTabChange={setConnectionTab}
              compactTableLayout
              stretchTableArea
            />
          </div>
        )}
      </div>

      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="reject-modal-content cabinet-section-header flex w-full max-w-md flex-col items-center rounded-2xl border-0 p-6 text-center shadow-[var(--shadow-card)]">
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
              className={`mb-4 ${ADMIN_PANEL_TEXTAREA}`}
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
