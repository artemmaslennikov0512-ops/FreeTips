"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ADMIN_BTN, ADMIN_BTN_NEUTRAL_SM, ADMIN_BTN_PRIMARY, ADMIN_BTN_SM } from "@/lib/admin-button-classes";
import { ChevronDown, ChevronRight, ClipboardCheck, Copy, Send, Loader2 } from "lucide-react";
import { AdminStatusTabs, AdminRequestTab, apiStatusForTab } from "./AdminStatusTabs";

const STORAGE_KEY_ISSUED_LINKS = "admin_issued_registration_links";

interface StoredLink {
  link: string;
  expiresAt: string;
}

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

export interface RegistrationRequestRow {
  id: string;
  requestType: string;
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
  companyName?: string | null;
  companyRole?: string | null;
  employeeCount?: number | null;
  adminFullName?: string | null;
  adminContactPhone?: string | null;
}

function ConnectionRequestDetails({ r, twoColumnFromSm }: { r: RegistrationRequestRow; twoColumnFromSm?: boolean }) {
  const grid =
    twoColumnFromSm === true ? "grid gap-2 text-sm text-white/90 sm:grid-cols-2" : "grid gap-2 text-sm text-white/90";
  if (r.requestType === "establishment") {
    return (
      <div className={grid}>
        <p className="break-words">
          <span className="text-white/70">Компания:</span> {r.companyName ?? "—"}
        </p>
        <p className="break-words">
          <span className="text-white/70">Роль в компании:</span> {r.companyRole ?? "—"}
        </p>
        <p>
          <span className="text-white/70">Сотрудников:</span> {r.employeeCount ?? "—"}
        </p>
        <p className="break-all">
          <span className="text-white/70">Телефон:</span> {r.phone || "—"}
        </p>
        <p className="break-words">
          <span className="text-white/70">ФИО:</span> {r.fullName}
        </p>
        <p className="break-all">
          <span className="text-white/70">Почта:</span> {r.email}
        </p>
      </div>
    );
  }
  return (
    <div className={grid}>
      <p>
        <span className="text-white/70">Дата рождения:</span> {r.dateOfBirth}
      </p>
      <p className="break-words">
        <span className="text-white/70">Заведение:</span> {r.establishment || "—"}
      </p>
      <p className="break-all">
        <span className="text-white/70">Телефон:</span> {r.phone || "—"}
      </p>
      <p className="break-words">
        <span className="text-white/70">Вид деятельности:</span> {r.activityType || "—"}
      </p>
      <p className="break-words">
        <span className="text-white/70">ФИО администратора:</span> {r.adminFullName ?? "—"}
      </p>
      <p className="break-all">
        <span className="text-white/70">Телефон администратора:</span> {r.adminContactPhone ?? "—"}
      </p>
    </div>
  );
}

type BlockProps = {
  /** Счётчики для бейджей на подвкладках «На рассмотрении / Принятые / Отклонённые». */
  connectionCounts?: { pending: number; approved: number; rejected: number };
  /** Вызвать после одобрения заявки (обновить счётчики в родителе). */
  onAfterMutation?: () => void;
};

export function AdminConnectionRequestsBlock({ connectionCounts, onAfterMutation }: BlockProps) {
  const [tab, setTab] = useState<AdminRequestTab>("pending");
  const [list, setList] = useState<RegistrationRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sendingTokenId, setSendingTokenId] = useState<string | null>(null);
  const [issuedLinksByRequestId, setIssuedLinksByRequestId] = useState<Record<string, string>>({});

  useEffect(() => {
    const valid = loadIssuedLinksFromStorage();
    if (Object.keys(valid).length > 0) setIssuedLinksByRequestId(valid);
  }, []);

  const fetchList = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const status = apiStatusForTab(tab);
      const res = await fetch(`/api/admin/registration-requests?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError("Ошибка загрузки заявок на подключение");
        return;
      }
      const data = (await res.json()) as { requests: RegistrationRequestRow[] };
      setList((data.requests ?? []).map((r) => ({ ...r, tokenExpiresAt: r.tokenExpiresAt ?? null })));
    } catch {
      setError("Ошибка загрузки заявок на подключение");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const getLinkForRequest = (requestId: string) => issuedLinksByRequestId[requestId];

  const copyLink = (link: string) => {
    void navigator.clipboard.writeText(link);
  };

  const handleApprove = async (id: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setApprovingId(id);
    try {
      const res = await fetch(`/api/admin/registration-requests/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as { link?: string; expiresAt?: string; error?: string };
      if (!res.ok) {
        alert(data.error || "Ошибка одобрения");
        return;
      }
      if (data.link) {
        setIssuedLinksByRequestId((prev) => ({ ...prev, [id]: data.link! }));
        const expiresAt = data.expiresAt;
        if (expiresAt) {
          try {
            const raw = localStorage.getItem(STORAGE_KEY_ISSUED_LINKS);
            const stored = raw ? (JSON.parse(raw) as Record<string, StoredLink>) : {};
            stored[id] = { link: data.link!, expiresAt };
            localStorage.setItem(STORAGE_KEY_ISSUED_LINKS, JSON.stringify(stored));
          } catch {
            /* ignore */
          }
        }
      }
      await fetchList();
      onAfterMutation?.();
    } finally {
      setApprovingId(null);
    }
  };

  const handleSendToken = async (id: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setSendingTokenId(id);
    try {
      const res = await fetch(`/api/admin/registration-requests/${id}/send-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as { link?: string; expiresAt?: string; error?: string; message?: string };
      if (!res.ok) {
        alert(data.error || "Ошибка отправки");
        return;
      }
      if (data.link) {
        setIssuedLinksByRequestId((prev) => ({ ...prev, [id]: data.link! }));
        const expiresAt = data.expiresAt;
        if (expiresAt) {
          try {
            const raw = localStorage.getItem(STORAGE_KEY_ISSUED_LINKS);
            const stored = raw ? (JSON.parse(raw) as Record<string, StoredLink>) : {};
            stored[id] = { link: data.link!, expiresAt };
            localStorage.setItem(STORAGE_KEY_ISSUED_LINKS, JSON.stringify(stored));
          } catch {
            /* ignore */
          }
        }
      }
      alert(data.message || "Ссылка отправлена на почту из заявки");
    } finally {
      setSendingTokenId(null);
    }
  };

  const emptyMessage =
    tab === "pending"
      ? "Нет заявок на рассмотрении"
      : tab === "approved"
        ? "Нет принятых заявок"
        : "Нет отклонённых заявок";

  const subTabBadges = connectionCounts
    ? {
        pending: connectionCounts.pending,
        approved: connectionCounts.approved,
        rejected: connectionCounts.rejected,
      }
    : undefined;

  return (
    <section className="space-y-4">
      <AdminStatusTabs value={tab} onChange={setTab} badges={subTabBadges} />
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
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center text-white/90">{emptyMessage}</div>
      ) : (
        <>
          <div className="space-y-4 lg:hidden">
            {list.map((r) => {
              const linkForRow = getLinkForRequest(r.id);
              const isApproving = approvingId === r.id;
              const isMobileExpanded = expandedId === r.id;
              return (
                <div key={r.id} className="admin-dashboard-table cabinet-section-header rounded-2xl border-0 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-white/70">{r.requestType === "establishment" ? "Заведение" : "Получатель"}</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === "PENDING"
                          ? "bg-white/20 text-white"
                          : r.status === "APPROVED"
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white/80"
                      }`}
                    >
                      {r.status === "PENDING" ? "Ожидает" : r.status === "APPROVED" ? "Принята" : "Отклонена"}
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-white">{r.fullName}</p>
                  <p className="truncate text-sm text-white/80">{r.email}</p>
                  <p className="mt-1 text-xs text-white/60">
                    {new Date(r.createdAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isMobileExpanded ? null : r.id)}
                    className={`${ADMIN_BTN} admin-btn--neutral mt-3 flex w-full items-center justify-center gap-2 !rounded-xl py-2.5 text-sm`}
                    aria-expanded={isMobileExpanded}
                  >
                    {isMobileExpanded ? (
                      <>
                        <ChevronDown className="h-4 w-4 shrink-0" />
                        Свернуть данные заявки
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                        Все данные заявки
                      </>
                    )}
                  </button>
                  {isMobileExpanded && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      <ConnectionRequestDetails r={r} />
                    </div>
                  )}
                  {tab === "pending" && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      {r.status === "PENDING" && !r.hasToken && (
                        <button
                          type="button"
                          disabled={isApproving}
                          onClick={() => handleApprove(r.id)}
                          className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-1.5 px-3 py-2 text-sm disabled:opacity-50`}
                        >
                          <ClipboardCheck className="h-4 w-4" />
                          {isApproving ? "Создание ссылки..." : "Принять подключение"}
                        </button>
                      )}
                      {linkForRow && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyLink(linkForRow)}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1`}
                            title="Копировать"
                          >
                            <Copy className="h-4 w-4" /> Копировать
                          </button>
                          <button
                            type="button"
                            disabled={sendingTokenId === r.id}
                            onClick={() => handleSendToken(r.id)}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 disabled:opacity-50`}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {sendingTokenId === r.id ? "Отправка…" : "Выслать токен"}
                          </button>
                        </>
                      )}
                      {r.status === "APPROVED" && r.hasToken && !linkForRow && (
                        <button
                          type="button"
                          disabled={sendingTokenId === r.id}
                          onClick={() => handleSendToken(r.id)}
                          className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 disabled:opacity-50`}
                        >
                          <Send className="h-3.5 w-3.5" />
                          {sendingTokenId === r.id ? "Отправка…" : "Выслать токен"}
                        </button>
                      )}
                    </div>
                  )}
                  {tab === "approved" && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      {linkForRow && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyLink(linkForRow)}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1`}
                          >
                            <Copy className="h-4 w-4" /> Копировать
                          </button>
                          <button
                            type="button"
                            disabled={sendingTokenId === r.id}
                            onClick={() => handleSendToken(r.id)}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 disabled:opacity-50`}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {sendingTokenId === r.id ? "Отправка…" : "Выслать токен"}
                          </button>
                        </>
                      )}
                      {r.hasToken && !linkForRow && (
                        <button
                          type="button"
                          disabled={sendingTokenId === r.id}
                          onClick={() => handleSendToken(r.id)}
                          className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 disabled:opacity-50`}
                        >
                          <Send className="h-3.5 w-3.5" />
                          {sendingTokenId === r.id ? "Отправка…" : "Выслать токен"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="admin-dashboard-table cabinet-section-header max-lg:hidden overflow-hidden rounded-2xl border-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm text-white">
                <thead>
                  <tr className="border-0 bg-white/10">
                    <th className="w-8 whitespace-nowrap p-3 text-white/80" />
                    <th className="whitespace-nowrap p-3 font-medium text-white">Тип</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">ФИО</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">Почта</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">Дата заявки</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">Статус</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const isExpanded = expandedId === r.id;
                    const isApproving = approvingId === r.id;
                    const linkForRow = getLinkForRequest(r.id);
                    return (
                      <Fragment key={r.id}>
                        <tr className="border-0 transition-colors hover:bg-white/10">
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : r.id)}
                              className={`${ADMIN_BTN} admin-btn--neutral !min-h-0 !min-w-0 !rounded-lg !p-1 !px-1`}
                              aria-label={isExpanded ? "Свернуть" : "Развернуть"}
                            >
                              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </button>
                          </td>
                          <td className="whitespace-nowrap p-3 text-white/90">
                            {r.requestType === "establishment" ? "Заведение" : "Получатель"}
                          </td>
                          <td className="whitespace-nowrap p-3 text-white/90">{r.fullName}</td>
                          <td className="whitespace-nowrap p-3 text-white/90">{r.email}</td>
                          <td className="whitespace-nowrap p-3 text-white/80">
                            {new Date(r.createdAt).toLocaleString("ru-RU", {
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
                              {r.status === "PENDING" ? "Ожидает" : r.status === "APPROVED" ? "Принята" : "Отклонена"}
                            </span>
                          </td>
                          <td className="p-3">
                            {tab === "pending" && r.status === "PENDING" && !r.hasToken && (
                              <button
                                type="button"
                                disabled={isApproving}
                                onClick={() => handleApprove(r.id)}
                                className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-1.5 px-3 py-1.5 text-sm disabled:opacity-50`}
                              >
                                <ClipboardCheck className="h-4 w-4" />
                                {isApproving ? "Создание ссылки..." : "Принять подключение"}
                              </button>
                            )}
                            {tab === "pending" && linkForRow && (
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={linkForRow}
                                    className="max-w-[280px] rounded border-0 bg-[var(--color-light-gray)] px-2 py-1 text-xs text-[var(--color-text)]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => copyLink(linkForRow)}
                                    className={`${ADMIN_BTN} admin-btn--neutral !min-h-0 !min-w-0 !rounded-lg !p-1.5`}
                                    title="Копировать"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sendingTokenId === r.id}
                                    onClick={() => handleSendToken(r.id)}
                                    className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 px-2.5 py-1 disabled:opacity-50`}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    {sendingTokenId === r.id ? "Отправка…" : "Выслать токен"}
                                  </button>
                                </div>
                                <span className="text-xs text-white/80">Одноразовая ссылка — только одна регистрация</span>
                              </div>
                            )}
                            {tab === "pending" && r.status === "APPROVED" && r.hasToken && !linkForRow && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-white/80">Ссылка выдана</span>
                                <button
                                  type="button"
                                  disabled={sendingTokenId === r.id}
                                  onClick={() => handleSendToken(r.id)}
                                  className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 px-2.5 py-1 disabled:opacity-50`}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  {sendingTokenId === r.id ? "Отправка…" : "Выслать токен"}
                                </button>
                              </div>
                            )}
                            {tab === "approved" && linkForRow && (
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={linkForRow}
                                    className="max-w-[280px] rounded border-0 bg-[var(--color-light-gray)] px-2 py-1 text-xs text-[var(--color-text)]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => copyLink(linkForRow)}
                                    className={`${ADMIN_BTN} admin-btn--neutral !min-h-0 !min-w-0 !rounded-lg !p-1.5`}
                                    title="Копировать"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sendingTokenId === r.id}
                                    onClick={() => handleSendToken(r.id)}
                                    className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 px-2.5 py-1 disabled:opacity-50`}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    {sendingTokenId === r.id ? "Отправка…" : "Выслать токен"}
                                  </button>
                                </div>
                              </div>
                            )}
                            {tab === "approved" && r.hasToken && !linkForRow && (
                              <button
                                type="button"
                                disabled={sendingTokenId === r.id}
                                onClick={() => handleSendToken(r.id)}
                                className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 px-2.5 py-1 disabled:opacity-50`}
                              >
                                <Send className="h-3.5 w-3.5" />
                                {sendingTokenId === r.id ? "Отправка…" : "Выслать токен"}
                              </button>
                            )}
                            {tab === "rejected" && <span className="text-xs text-white/60">—</span>}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-0 bg-white/10">
                            <td colSpan={7} className="p-4">
                              <ConnectionRequestDetails r={r} twoColumnFromSm />
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
        </>
      )}
    </section>
  );
}
