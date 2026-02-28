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
