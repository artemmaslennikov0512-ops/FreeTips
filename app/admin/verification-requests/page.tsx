"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Download, Loader2 } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";

interface VerificationRequestItem {
  id: string;
  userId: string;
  fullName: string;
  birthDate: string;
  passportSeries: string;
  passportNumber: string;
  inn: string;
  createdAt: string;
  login: string;
  email: string | null;
  uniqueId: number;
  hasPassportMain: boolean;
  hasPassportSpread: boolean;
  hasSelfie: boolean;
}

const DOC_LABELS: Record<string, string> = {
  passport_main: "Главное фото паспорта",
  passport_spread: "Разворот",
  selfie: "Селфи с паспортом",
};

export default function AdminVerificationRequestsPage() {
  const [list, setList] = useState<VerificationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; login: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verification-requests", {
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
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">
          Заявки на верификацию
        </h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-gold)]" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center text-[var(--color-text)]/80">
          Нет заявок на рассмотрении
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">Дата</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">Пользователь</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">ФИО</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">Паспорт / ИНН</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">Документы</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">Действия</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-[var(--color-text)]/80">
                    {new Date(r.createdAt).toLocaleString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${r.userId}`}
                      className="text-[var(--color-brand-gold)] hover:underline"
                    >
                      {r.login}
                    </Link>
                    {r.email && (
                      <div className="text-xs text-[var(--color-text)]/60">{r.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{r.fullName}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]/90">
                    {r.passportSeries} {r.passportNumber}, ИНН {r.inn}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(["passport_main", "passport_spread", "selfie"] as const).map((type) => {
                        const has = type === "passport_main" ? r.hasPassportMain : type === "passport_spread" ? r.hasPassportSpread : r.hasSelfie;
                        const key = `${r.id}-${type}`;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => has && downloadDoc(r.id, type)}
                            disabled={!has || downloading === key}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs font-medium text-[var(--color-text)]/90 hover:bg-white/10 disabled:opacity-50"
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(r.id)}
                        disabled={approvingId === r.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-600/20 px-3 py-1.5 text-sm font-medium text-green-400 hover:bg-green-600/30 disabled:opacity-50"
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
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-600/30"
                      >
                        <X className="h-4 w-4" />
                        Отклонить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--color-navy)] p-6 shadow-xl">
            <h2 id="reject-modal-title" className="mb-4 text-lg font-semibold text-white">
              Отклонить заявку ({rejectModal.login})
            </h2>
            <p className="mb-2 text-sm text-white/80">
              Укажите причину отказа. Клиент увидит этот текст в личном кабинете.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Например: Нечитаемое фото паспорта. Загрузите чёткое изображение главной страницы."
              className="mb-4 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]"
              rows={4}
            />
            {rejectError && <p className="mb-2 text-sm text-red-400">{rejectError}</p>}
            <div className="flex justify-end gap-3">
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
