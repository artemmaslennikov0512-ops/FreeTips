"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ADMIN_BTN,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_NEUTRAL_SM,
  ADMIN_BTN_PRIMARY,
  ADMIN_BTN_SM,
} from "@/lib/admin-button-classes";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { Check, ChevronDown, ChevronRight, ClipboardCheck, Copy, Send, Loader2, XCircle } from "lucide-react";
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
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  hasToken: boolean;
  tokenExpiresAt: string | null;
  /** Текущий токен заявки использован при регистрации (есть пользователь). */
  isRegistered?: boolean;
  registeredAt?: string | null;
  registeredUserId?: string | null;
  registeredLogin?: string | null;
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
        {r.phone?.trim() ? (
          <p className="break-all">
            <span className="text-white/70">Телефон:</span> {r.phone}
          </p>
        ) : null}
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
      {r.phone?.trim() ? (
        <p className="break-all">
          <span className="text-white/70">Телефон:</span> {r.phone}
        </p>
      ) : null}
      <p className="break-words">
        <span className="text-white/70">Вид деятельности:</span> {r.activityType || "—"}
      </p>
      {(r.adminFullName?.trim() || r.adminContactPhone?.trim()) ? (
        <>
          <p className="break-words">
            <span className="text-white/70">ФИО администратора:</span> {r.adminFullName ?? "—"}
          </p>
          <p className="break-all">
            <span className="text-white/70">Телефон администратора:</span> {r.adminContactPhone ?? "—"}
          </p>
        </>
      ) : null}
    </div>
  );
}

function RegistrationFollowUpLine({ r }: { r: RegistrationRequestRow }) {
  const isRegistered = r.isRegistered === true;
  /* В светлой теме админки таблица всё равно на тёмном стекле; не использовать --color-text/--color-muted (они для светлого фона страницы). */
  const muted = "text-[var(--color-on-dark-muted)]";
  const dim = "text-white/55";
  const ok = "text-emerald-400";
  const pending = "text-amber-200/85";

  if (isRegistered) {
    const dt =
      r.registeredAt != null
        ? new Date(r.registeredAt).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null;
    return (
      <div className="mt-1.5 space-y-0.5 text-xs leading-snug">
        <p className={`font-medium ${ok}`}>Зарегистрирован</p>
        {r.registeredLogin ? (
          <p className={`break-all ${muted}`}>
            Логин:{" "}
            {r.registeredUserId ? (
              <Link
                href={`/admin/users/${r.registeredUserId}`}
                className="text-[var(--color-brand-gold)] underline-offset-2 hover:underline"
              >
                {r.registeredLogin}
              </Link>
            ) : (
              r.registeredLogin
            )}
          </p>
        ) : null}
        {dt ? <p className={dim}>{dt}</p> : null}
      </div>
    );
  }
  if (r.status === "APPROVED" && r.hasToken) {
    return <p className={`mt-1.5 text-xs ${pending}`}>По ссылке ещё не регистрировались</p>;
  }
  return null;
}

type BlockProps = {
  /** Счётчики для бейджей на подвкладках «На рассмотрении / Принятые / Отклонённые». */
  connectionCounts?: { pending: number; approved: number; rejected: number };
  /** Вызвать после одобрения заявки (обновить счётчики в родителе). */
  onAfterMutation?: () => void;
  /** Родитель рисует вкладки статусов (страница «Заявки» в одном блоке с верификацией). */
  hideStatusTabs?: boolean;
  /** Управляемый таб статуса (вместе с onStatusTabChange). */
  statusTab?: AdminRequestTab;
  onStatusTabChange?: (tab: AdminRequestTab) => void;
  /** Одна таблица с горизонтальным скроллом на всех ширинах (как «Приём по ссылкам»). */
  compactTableLayout?: boolean;
  /** Вместе с hideStatusTabs: область таблицы тянется по высоте карточки родителя. */
  stretchTableArea?: boolean;
};

export function AdminConnectionRequestsBlock({
  connectionCounts,
  onAfterMutation,
  hideStatusTabs = false,
  statusTab: controlledTab,
  onStatusTabChange,
  compactTableLayout = false,
  stretchTableArea = false,
}: BlockProps) {
  const [internalTab, setInternalTab] = useState<AdminRequestTab>("pending");
  const controlled =
    hideStatusTabs && controlledTab !== undefined && onStatusTabChange !== undefined;
  const tab = controlled ? controlledTab! : internalTab;
  const setTab = controlled ? onStatusTabChange! : setInternalTab;
  const [list, setList] = useState<RegistrationRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sendingTokenId, setSendingTokenId] = useState<string | null>(null);
  const [issuedLinksByRequestId, setIssuedLinksByRequestId] = useState<Record<string, string>>({});
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);
  const copySuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; label: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    const valid = loadIssuedLinksFromStorage();
    if (Object.keys(valid).length > 0) setIssuedLinksByRequestId(valid);
  }, []);

  useEffect(() => {
    return () => {
      if (copySuccessTimerRef.current) clearTimeout(copySuccessTimerRef.current);
    };
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
      setList(
        (data.requests ?? []).map((r) => ({
          ...r,
          rejectionReason: r.rejectionReason ?? null,
          reviewedAt: r.reviewedAt ?? null,
          tokenExpiresAt: r.tokenExpiresAt ?? null,
          isRegistered: r.isRegistered === true,
          registeredAt: r.registeredAt ?? null,
          registeredUserId: r.registeredUserId ?? null,
          registeredLogin: r.registeredLogin ?? null,
        })),
      );
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

  const COPY_FEEDBACK_MS = 2200;

  const copyLink = async (link: string, requestId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedRequestId(requestId);
      if (copySuccessTimerRef.current) clearTimeout(copySuccessTimerRef.current);
      copySuccessTimerRef.current = setTimeout(() => {
        setCopiedRequestId(null);
        copySuccessTimerRef.current = null;
      }, COPY_FEEDBACK_MS);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setRejectSubmitting(true);
    setRejectError(null);
    try {
      const res = await fetch(`/api/admin/registration-requests/${rejectModal.id}/reject`, {
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
        onAfterMutation?.();
      } else {
        setRejectError(body.error ?? "Ошибка отклонения");
      }
    } catch {
      setRejectError("Ошибка соединения");
    } finally {
      setRejectSubmitting(false);
    }
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
      const data = (await res.json().catch(() => ({}))) as {
        link?: string;
        expiresAt?: string;
        error?: string;
        message?: string;
        detail?: string;
      };
      if (!res.ok) {
        const parts = [data.error, data.detail].filter((s): s is string => Boolean(s?.trim()));
        alert(parts.length > 0 ? parts.join("\n\n") : "Ошибка отправки");
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

  const inner = (
    <>
      {!hideStatusTabs && <AdminStatusTabs value={tab} onChange={setTab} badges={subTabBadges} />}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
          {error}
        </div>
      )}
      {loading ? (
        <div
          className={`flex items-center justify-center text-[var(--color-brand-gold)] ${
            stretchTableArea && hideStatusTabs
              ? "min-h-[min(40dvh,360px)] flex-1 py-8"
              : "py-12"
          }`}
        >
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : list.length === 0 ? (
        <div
          className={`rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center text-white/90 ${
            stretchTableArea && hideStatusTabs ? "min-h-[min(40dvh,360px)] flex flex-1 flex-col items-center justify-center" : ""
          }`}
        >
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="space-y-4 lg:hidden">
            {list.map((r) => {
              const linkForRow = getLinkForRequest(r.id);
              const copyDone = copiedRequestId === r.id;
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
                  <RegistrationFollowUpLine r={r} />
                  {tab === "rejected" && r.rejectionReason?.trim() ? (
                    <p className="mt-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs leading-snug text-red-100/95">
                      {r.rejectionReason}
                    </p>
                  ) : null}
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
                        <>
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => handleApprove(r.id)}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-1.5 px-3 py-2 text-sm disabled:opacity-50`}
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            {isApproving ? "Создание ссылки..." : "Принять подключение"}
                          </button>
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => {
                              setRejectError(null);
                              setRejectModal({ id: r.id, label: r.email || r.fullName });
                            }}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} gap-1.5 px-3 py-2 text-sm disabled:opacity-50`}
                          >
                            <XCircle className="h-4 w-4" />
                            Отклонить
                          </button>
                        </>
                      )}
                      {linkForRow && (
                        <>
                          <button
                            type="button"
                            onClick={() => void copyLink(linkForRow, r.id)}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1 ${copyDone ? "admin-btn--success" : ""}`}
                            title="Копировать ссылку в буфер"
                            aria-label={copyDone ? "Скопировано" : "Копировать ссылку"}
                          >
                            {copyDone ? (
                              <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} aria-hidden />
                            ) : (
                              <Copy className="h-4 w-4" aria-hidden />
                            )}
                            {copyDone ? "Скопировано" : "Копировать"}
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
                            onClick={() => void copyLink(linkForRow, r.id)}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1 ${copyDone ? "admin-btn--success" : ""}`}
                            title="Копировать ссылку в буфер"
                            aria-label={copyDone ? "Скопировано" : "Копировать ссылку"}
                          >
                            {copyDone ? (
                              <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} aria-hidden />
                            ) : (
                              <Copy className="h-4 w-4" aria-hidden />
                            )}
                            {copyDone ? "Скопировано" : "Копировать"}
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

          <div
            className={`admin-dashboard-table cabinet-section-header hidden max-w-full rounded-xl border-0 text-left lg:block ${
              stretchTableArea && compactTableLayout
                ? "min-h-[min(48dvh,520px)] min-w-0 w-full flex-1 overflow-auto"
                : "w-full overflow-hidden"
            }`}
          >
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm text-white">
                <thead>
                  <tr className="border-0 bg-white/10">
                    <th className="w-8 whitespace-nowrap p-3 text-white/80" />
                    <th className="whitespace-nowrap p-3 font-medium text-white">Тип</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">ФИО</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">Почта</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">Дата заявки</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">Статус</th>
                    <th className="whitespace-nowrap p-3 font-medium text-white">
                      {tab === "rejected" ? "Причина отказа" : "Действие"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const isExpanded = expandedId === r.id;
                    const isApproving = approvingId === r.id;
                    const linkForRow = getLinkForRequest(r.id);
                    const copyDone = copiedRequestId === r.id;
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
                          <td className="max-w-[14rem] p-3 align-top">
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
                            <RegistrationFollowUpLine r={r} />
                          </td>
                          <td className="p-3 align-top">
                            {tab === "pending" && r.status === "PENDING" && !r.hasToken && (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isApproving}
                                  onClick={() => handleApprove(r.id)}
                                  className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-1.5 px-3 py-1.5 text-sm disabled:opacity-50`}
                                >
                                  <ClipboardCheck className="h-4 w-4" />
                                  {isApproving ? "Создание ссылки..." : "Принять подключение"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isApproving}
                                  onClick={() => {
                                    setRejectError(null);
                                    setRejectModal({ id: r.id, label: r.email || r.fullName });
                                  }}
                                  className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} gap-1.5 px-3 py-1.5 text-sm disabled:opacity-50`}
                                >
                                  <XCircle className="h-4 w-4" />
                                  Отклонить
                                </button>
                              </div>
                            )}
                            {tab === "pending" && linkForRow && (
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={linkForRow}
                                    onFocus={(e) => e.currentTarget.select()}
                                    title="Нажмите — ссылка выделится, можно Ctrl+C"
                                    className="max-w-[280px] rounded border-0 bg-[var(--color-light-gray)] px-2 py-1 text-xs text-[var(--color-text)]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void copyLink(linkForRow, r.id)}
                                    className={`${ADMIN_BTN} admin-btn--neutral !min-h-0 !min-w-0 !rounded-lg !p-1.5 ${copyDone ? "admin-btn--success" : ""}`}
                                    title="Копировать ссылку в буфер"
                                    aria-label={copyDone ? "Скопировано" : "Копировать ссылку"}
                                  >
                                    {copyDone ? (
                                      <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} aria-hidden />
                                    ) : (
                                      <Copy className="h-4 w-4" aria-hidden />
                                    )}
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
                                    onFocus={(e) => e.currentTarget.select()}
                                    title="Нажмите — ссылка выделится, можно Ctrl+C"
                                    className="max-w-[280px] rounded border-0 bg-[var(--color-light-gray)] px-2 py-1 text-xs text-[var(--color-text)]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void copyLink(linkForRow, r.id)}
                                    className={`${ADMIN_BTN} admin-btn--neutral !min-h-0 !min-w-0 !rounded-lg !p-1.5 ${copyDone ? "admin-btn--success" : ""}`}
                                    title="Копировать ссылку в буфер"
                                    aria-label={copyDone ? "Скопировано" : "Копировать ссылку"}
                                  >
                                    {copyDone ? (
                                      <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} aria-hidden />
                                    ) : (
                                      <Copy className="h-4 w-4" aria-hidden />
                                    )}
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
                            {tab === "rejected" && (
                              <p className="max-w-[280px] whitespace-pre-wrap break-words text-xs text-red-200/90">
                                {r.rejectionReason?.trim() || "—"}
                              </p>
                            )}
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

      {rejectModal && (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="connection-reject-modal-title"
        >
          <div className="reject-modal-content cabinet-section-header flex w-full max-w-md flex-col items-center rounded-2xl border-0 p-6 shadow-[var(--shadow-card)]">
            <h2 id="connection-reject-modal-title" className="mb-3 w-full text-center text-lg font-semibold text-white">
              Отклонить заявку на подключение
            </h2>
            <p className="mb-1 w-full break-all text-center text-sm text-white/85">{rejectModal.label}</p>
            <p className="mb-4 w-full text-center text-sm text-white/70">
              После отклонения заявитель сможет подать новую заявку с этой же почтой. Укажите причину для внутреннего учёта — на
              почту заявителя она не отправляется.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Например: не отвечаете на уточняющие письма; данные заведения не подтверждены."
              className="mb-4 w-full min-h-[120px] rounded-xl px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]/40"
              rows={4}
            />
            {rejectError && (
              <p className="reject-modal-error-msg mb-3 w-full text-center text-sm text-red-400">{rejectError}</p>
            )}
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
                onClick={() => void handleRejectSubmit()}
                disabled={!rejectReason.trim() || rejectSubmitting}
                className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} px-4 py-2`}
              >
                {rejectSubmitting ? "Отправка…" : "Отклонить заявку"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return hideStatusTabs ? (
    <div
      className={`flex flex-col gap-4 ${stretchTableArea ? "min-h-0 min-w-0 flex-1" : ""}`}
    >
      {inner}
    </div>
  ) : (
    <section className="space-y-4">{inner}</section>
  );
}
