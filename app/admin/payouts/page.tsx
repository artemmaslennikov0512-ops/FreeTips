"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, CheckCircle2, XCircle } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { formatDate, formatMoneyCompact } from "@/lib/utils";

interface Payout {
  id: string;
  userId: string;
  userLogin: string;
  userEmail: string | null;
  amountKop: number;
  status: "CREATED" | "PROCESSING" | "COMPLETED" | "REJECTED";
  details: string;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PayoutsResponse {
  payouts: Payout[];
  total: number;
  limit: number;
  offset: number;
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [sendingPaygine, setSendingPaygine] = useState<string | null>(null);
  const [payoutIdForPanModal, setPayoutIdForPanModal] = useState<string | null>(null);
  const [panInput, setPanInput] = useState("");

  const fetchPayouts = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setLoading(true);
    try {
      const url = `/api/admin/payouts${statusFilter ? `?status=${statusFilter}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Ошибка загрузки заявок");
        return;
      }

      const data: PayoutsResponse = await res.json();
      setPayouts(data.payouts);
    } catch {
      setError("Ошибка загрузки заявок");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchPayouts();
  }, [fetchPayouts]);

  const handleStatusChange = async (payoutId: string, newStatus: Payout["status"]) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setUpdating(payoutId);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        alert("Ошибка обновления статуса");
        return;
      }

      await fetchPayouts();
    } catch {
      alert("Ошибка обновления статуса");
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenSendPaygineModal = (payoutId: string) => {
    setPayoutIdForPanModal(payoutId);
    setPanInput("");
  };

  const handleSendToPaygineSubmit = async () => {
    const payoutId = payoutIdForPanModal;
    if (!payoutId) return;
    const pan = panInput.replace(/\s/g, "").trim();
    if (pan.length < 8) {
      alert("Введите номер карты (не менее 8 цифр)");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setSendingPaygine(payoutId);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/send-paygine`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ pan }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = [data.description, data.error].filter(Boolean).join(" — ") || "Ошибка отправки в Paygine";
        if (data.code) alert(`Код: ${data.code}. ${msg}`);
        else alert(msg);
        return;
      }
      setPayoutIdForPanModal(null);
      setPanInput("");
      await fetchPayouts();
    } catch {
      alert("Ошибка отправки в Paygine");
    } finally {
      setSendingPaygine(null);
    }
  };

  const getStatusBadge = (status: Payout["status"]) => {
    const styles = {
      CREATED: "bg-[var(--color-light-gray)] text-[var(--color-text-secondary)]",
      PROCESSING: "bg-[var(--color-light-gray)] text-[var(--color-text)]",
      COMPLETED: "bg-[var(--color-light-gray)] text-[var(--color-text)]",
      REJECTED: "bg-[var(--color-light-gray)] text-[var(--color-text-secondary)]",
    };
    const labels = {
      CREATED: "Создана",
      PROCESSING: "В обработке",
      COMPLETED: "Выполнена",
      REJECTED: "Отклонена",
    };
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-[var(--color-text)]">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-6 flex min-w-0 items-center justify-center gap-3 sm:mb-8">
        <Send className="h-7 w-7 shrink-0 text-[var(--color-accent-gold)] sm:h-8 sm:w-8" />
        <h1 className="min-w-0 text-center text-lg font-bold text-[var(--color-text)] sm:text-xl">Заявки на вывод</h1>
      </div>

      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cabinet-section-header rounded-xl border-0 px-4 py-2 text-sm text-[var(--color-text)] focus:outline-none"
        >
          <option value="">Все статусы</option>
          <option value="CREATED">Создана</option>
          <option value="PROCESSING">В обработке</option>
          <option value="COMPLETED">Выполнена</option>
          <option value="REJECTED">Отклонена</option>
        </select>
      </div>

      <div className="cabinet-section-header overflow-x-auto rounded-xl border-0">
        <table className="w-full">
          <thead className="border-0 bg-[var(--color-brand-gold)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                ID
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Пользователь
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Сумма
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Статус
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Дата
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-muted)]">
                  Заявок не найдено
                </td>
              </tr>
            ) : (
              payouts.map((payout) => (
                <tr key={payout.id} className="border-0 hover:bg-[var(--color-light-gray)]">
                  <td className="px-4 py-3 text-sm text-[var(--color-muted)]">
                    {payout.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-[var(--color-text)]">{payout.userLogin}</div>
                      {payout.userEmail && (
                        <div className="text-xs text-[var(--color-muted)]">{payout.userEmail}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--color-text)]">
                    {formatMoneyCompact(payout.amountKop)}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(payout.status)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-muted)]">
                    {formatDate(payout.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(payout.status === "CREATED" || payout.status === "PROCESSING") && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenSendPaygineModal(payout.id)}
                            disabled={sendingPaygine === payout.id}
                            className="flex items-center gap-1 rounded-lg bg-[var(--color-brand-gold)] px-3 py-1.5 text-xs font-medium text-[#0a192f] transition-colors hover:opacity-90 disabled:opacity-50"
                            title="Отправить вывод в Paygine на карту (SDPayOut). Только после успешной отправки заявка станет «Выполнена»."
                          >
                            <Send className="h-3 w-3" />
                            {sendingPaygine === payout.id ? "Отправка…" : "В Paygine"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(payout.id, "REJECTED")}
                            disabled={updating === payout.id}
                            className="flex items-center gap-1 rounded-lg bg-[var(--color-dark-gray)] px-3 py-1.5 text-xs font-medium text-[var(--color-white)] transition-colors hover:opacity-90 disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" />
                            Отклонить
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Отметить выполненной без отправки в Paygine? Использовать только если выплата проведена другим способом (наличные и т.п.). В Paygine заказа не будет.")) {
                                void handleStatusChange(payout.id, "COMPLETED");
                              }
                            }}
                            disabled={updating === payout.id}
                            className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:opacity-90 disabled:opacity-50"
                            title="Только для ручной выплаты вне Paygine"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Вручную
                          </button>
                        </>
                      )}
                      {payout.status === "COMPLETED" && !payout.externalId && (
                        <button
                          type="button"
                          onClick={() => handleOpenSendPaygineModal(payout.id)}
                          disabled={sendingPaygine === payout.id}
                          className="flex items-center gap-1 rounded-lg bg-[var(--color-brand-gold)] px-3 py-1.5 text-xs font-medium text-[#0a192f] transition-colors hover:opacity-90 disabled:opacity-50"
                          title="Заявка была отмечена «Вручную» — в Paygine вывода нет. Отправить сейчас (SDPayOut)."
                        >
                          <Send className="h-3 w-3" />
                          {sendingPaygine === payout.id ? "Отправка…" : "В Paygine"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payoutIdForPanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pan-modal-title"
        >
          <div className="mx-4 w-full max-w-md rounded-xl bg-[var(--color-bg)] p-6 shadow-lg">
            <h2 id="pan-modal-title" className="mb-4 text-lg font-semibold text-[var(--color-text)]">
              Вывод в Paygine на карту
            </h2>
            <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
              Укажите номер карты получателя (без пробелов или с пробелами — будет отправлено в Paygine для вывода).
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Номер карты"
              value={panInput}
              onChange={(e) => setPanInput(e.target.value)}
              className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-brand-gold)] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setPayoutIdForPanModal(null); setPanInput(""); }}
                className="rounded-lg bg-[var(--color-dark-gray)] px-4 py-2 text-sm font-medium text-[var(--color-white)] hover:opacity-90"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleSendToPaygineSubmit()}
                disabled={sendingPaygine === payoutIdForPanModal}
                className="rounded-lg bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
              >
                {sendingPaygine === payoutIdForPanModal ? "Отправка…" : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
