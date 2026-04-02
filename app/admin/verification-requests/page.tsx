"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Download, Loader2 } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { AdminStatusTabs, AdminRequestTab, apiStatusForTab } from "./AdminStatusTabs";
import { AdminRequestsMainTabs, AdminRequestsMainTab } from "./AdminRequestsMainTabs";
import { AdminConnectionRequestsBlock } from "./AdminConnectionRequestsBlock";

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
  hasSelfie: boolean;
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
  selfie: "Селфи с паспортом",
};

const ZERO_COUNTS: SectionCounts = { pending: 0, approved: 0, rejected: 0 };

export default function AdminVerificationRequestsPage() {
  const [mainTab, setMainTab] = useState<AdminRequestsMainTab>("verification");
  const [verificationTab, setVerificationTab] = useState<AdminRequestTab>("pending");
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
        await fetchCounts();
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
        await fetchCounts();
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
      a.download = `${type}.${type === "passport_main" ? "jpg" : "jpg"}`;
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
  const verificationSubBadges: Partial<Record<AdminRequestTab, number>> = {
    pending: vCounts.pending,
    approved: vCounts.approved,
    rejected: vCounts.rejected,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">Заявки</h1>
        <p className="max-w-lg text-sm text-[var(--color-text)]/75">
          Выберите раздел: верификация официантов или подключение к сервису
        </p>
        <AdminRequestsMainTabs
          value={mainTab}
          onChange={setMainTab}
          pendingVerification={vCounts.pending}
          pendingConnection={cCounts.pending}
          className="pt-1"
        />
      </div>

      {mainTab === "verification" && (
        <section className="space-y-4">
          <AdminStatusTabs value={verificationTab} onChange={setVerificationTab} badges={verificationSubBadges} />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-gold)]" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center text-[var(--color-text)]/80">
              {emptyMessage}
            </div>
          ) : (
            <>
              <div className="space-y-4 lg:hidden">
                {list.map((r) => (
                  <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-white/70">{new Date(r.createdAt).toLocaleString("ru-RU")}</span>
                      <Link
                        href={`/admin/users/${r.userId}`}
                        className="text-sm font-medium text-[var(--color-brand-gold)] hover:underline"
                      >
                        {r.login}
                      </Link>
                    </div>
                    <p className="text-sm text-white">{r.fullName}</p>
                    <p className="mt-1 text-xs text-white/80">
                      {r.passportSeries} {r.passportNumber}, ИНН {r.inn}
                    </p>
                    {r.email && <p className="mt-1 truncate text-xs text-white/70">{r.email}</p>}
                    {!isPending && r.reviewedAt && (
                      <p className="mt-2 text-xs text-white/60">
                        Рассмотрено: {new Date(r.reviewedAt).toLocaleString("ru-RU")}
                      </p>
                    )}
                    {verificationTab === "rejected" && r.rejectionReason && (
                      <p className="mt-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-xs text-red-200/90">{r.rejectionReason}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["passport_main", "passport_spread", "selfie"] as const).map((type) => {
                        const has =
                          type === "passport_main" ? r.hasPassportMain : type === "passport_spread" ? r.hasPassportSpread : r.hasSelfie;
                        const key = `${r.id}-${type}`;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => has && downloadDoc(r.id, type)}
                            disabled={!has || downloading === key}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50"
                          >
                            {downloading === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                            {DOC_LABELS[type]}
                          </button>
                        );
                      })}
                    </div>
                    {isPending && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          onClick={() => handleApprove(r.id)}
                          disabled={approvingId === r.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600/20 px-3 py-2 text-sm font-medium text-green-400 hover:bg-green-600/30 disabled:opacity-50"
                        >
                          {approvingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Подтвердить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectModal({ id: r.id, login: r.login });
                            setRejectReason("");
                            setRejectError(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600/20 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-600/30"
                        >
                          <X className="h-4 w-4" />
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="max-lg:hidden overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-white">Дата</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-white">Пользователь</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-white">ФИО</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-white">Паспорт / ИНН</th>
                      {!isPending && <th className="whitespace-nowrap px-4 py-3 font-semibold text-white">Рассмотрено</th>}
                      {verificationTab === "rejected" && (
                        <th className="min-w-[140px] px-4 py-3 font-semibold text-white">Причина отказа</th>
                      )}
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-white">Документы</th>
                      {isPending && <th className="whitespace-nowrap px-4 py-3 font-semibold text-white">Действия</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="whitespace-nowrap px-4 py-3 text-white">
                          {new Date(r.createdAt).toLocaleString("ru-RU")}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/users/${r.userId}`} className="text-[var(--color-brand-gold)] hover:underline">
                            {r.login}
                          </Link>
                          {r.email && <div className="text-xs text-white/80">{r.email}</div>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-white">{r.fullName}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-white">
                          {r.passportSeries} {r.passportNumber}, ИНН {r.inn}
                        </td>
                        {!isPending && (
                          <td className="whitespace-nowrap px-4 py-3 text-white/80">
                            {r.reviewedAt ? new Date(r.reviewedAt).toLocaleString("ru-RU") : "—"}
                          </td>
                        )}
                        {verificationTab === "rejected" && (
                          <td className="max-w-[220px] px-4 py-3 text-xs text-red-200/90">{r.rejectionReason ?? "—"}</td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {(["passport_main", "passport_spread", "selfie"] as const).map((type) => {
                              const has =
                                type === "passport_main"
                                  ? r.hasPassportMain
                                  : type === "passport_spread"
                                    ? r.hasPassportSpread
                                    : r.hasSelfie;
                              const key = `${r.id}-${type}`;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => has && downloadDoc(r.id, type)}
                                  disabled={!has || downloading === key}
                                  className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50"
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
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprove(r.id)}
                                disabled={approvingId === r.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-green-600/20 px-3 py-1.5 text-sm font-medium text-green-400 hover:bg-green-600/30 disabled:opacity-50"
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
                                className="inline-flex items-center gap-1 rounded-lg bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-600/30"
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
            </>
          )}
        </section>
      )}

      {mainTab === "connection" && (
        <section className="space-y-4">
          <p className="mx-auto max-w-lg text-center text-sm text-[var(--color-text)]/70">
            Регистрация заведений и отдельных получателей. Одобрение выдаёт ссылку для регистрации.
          </p>
          <AdminConnectionRequestsBlock connectionCounts={cCounts} onAfterMutation={fetchCounts} />
        </section>
      )}

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
                className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || rejectSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
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
