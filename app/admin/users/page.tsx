"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, Copy, Check, Filter, ArrowUpDown, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { CustomDropdown } from "@/components/CustomDropdown";
import { getBaseUrl } from "@/lib/get-base-url";
import { formatDate, formatMoneyCompact, formatRelativeTimeAgo } from "@/lib/utils";
import { LK_PRESENCE_WINDOW_MS } from "@/lib/lk-presence";
import {
  ADMIN_BTN,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_ICON,
  ADMIN_BTN_PRIMARY,
  ADMIN_BTN_SM,
} from "@/lib/admin-button-classes";
import { ADMIN_PANEL_STATE_CENTER } from "@/lib/admin-surface-classes";
import { PANEL_PAGE_TITLE_ADMIN } from "@/lib/panel-shell-visual-classes";
import { fetchWithAuth } from "@/lib/auth-client";

interface User {
  id: string;
  uniqueId: number;
  login: string;
  email: string | null;
  role: string;
  createdAt: string;
  isBlocked: boolean;
  tipSlugs: string[];
  lastSeenAt: string | null;
  activeInLk: boolean;
  stats: {
    balanceKop: number;
    totalReceivedKop: number;
    transactionsCount: number;
    payoutsPendingCount: number;
  };
}

interface UsersResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

function lkPresenceTitle(user: User): string {
  const winMin = Math.max(1, Math.round(LK_PRESENCE_WINDOW_MS / 60000));
  if (user.activeInLk) {
    return `Была активность в ЛК за последние ${winMin} мин: загрузка ЛК, возврат на вкладку или запрос к API с JWT. Пока не прошло ${winMin} мин с последней записи, в БД снова не пишем. Это не сессия входа — из кабинета выход только по «Выйти».`;
  }
  if (user.lastSeenAt) {
    return `За последние ${winMin} мин не было запросов к ЛК и не было захода/возврата на вкладку. Последняя активность: ${formatDate(user.lastSeenAt, { includeYear: true })} (${formatRelativeTimeAgo(user.lastSeenAt)}).`;
  }
  return "В ЛК ещё не заходил с включёнными пингами (старые аккаунты до обновления) или нет записи активности.";
}

function LkPresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={
        online
          ? "h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.55)]"
          : "h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.45)]"
      }
      aria-hidden
    />
  );
}

function LkPresenceCell({ user }: { user: User }) {
  const title = lkPresenceTitle(user);
  if (user.activeInLk) {
    return (
      <span className="inline-flex items-center justify-center text-emerald-400" title={title}>
        <LkPresenceDot online />
        <span className="sr-only">Сейчас в личном кабинете</span>
      </span>
    );
  }
  if (user.lastSeenAt) {
    return (
      <span className="inline-flex max-w-[9rem] items-center gap-2 text-[var(--color-text-secondary)]" title={title}>
        <LkPresenceDot online={false} />
        <span className="truncate text-xs">{formatRelativeTimeAgo(user.lastSeenAt)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-[var(--color-muted)]" title={title}>
      <LkPresenceDot online={false} />
      <span className="text-xs">—</span>
    </span>
  );
}

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [blockedFilter, setBlockedFilter] = useState("");
  const [lkActiveFilter, setLkActiveFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [registrationLink, setRegistrationLink] = useState<string | null>(null);
  const [linkJustCopied, setLinkJustCopied] = useState(false);
  const linkCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blockAllLoading, setBlockAllLoading] = useState(false);
  const [blockAllError, setBlockAllError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qp = new URLSearchParams();
      qp.set("limit", String(PAGE_SIZE));
      qp.set("offset", String(page * PAGE_SIZE));
      if (search) qp.set("search", search);
      if (roleFilter) qp.set("role", roleFilter);
      if (blockedFilter) qp.set("blocked", blockedFilter);
      if (lkActiveFilter === "true" || lkActiveFilter === "false") qp.set("lkActive", lkActiveFilter);
      if (sortBy) qp.set("sortBy", sortBy);
      if (sortOrder) qp.set("sortOrder", sortOrder);
      const qs = qp.toString();
      const url = `/api/admin/users?${qs}`;
      const res = await fetchWithAuth(url);

      if (!res.ok) {
        setError("Ошибка загрузки пользователей");
        setUsersTotal(0);
        return;
      }

      const data: UsersResponse = await res.json();
      setUsers(data.users);
      setUsersTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setError("Ошибка загрузки пользователей");
      setUsersTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, blockedFilter, lkActiveFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    setPage(0);
  }, [search, roleFilter, blockedFilter, lkActiveFilter, sortBy, sortOrder]);

  useEffect(() => {
    const lastPage = usersTotal <= 0 ? 0 : Math.max(0, Math.ceil(usersTotal / PAGE_SIZE) - 1);
    if (page > lastPage) setPage(lastPage);
  }, [usersTotal, page]);

  useLayoutEffect(() => {
    const v = new URLSearchParams(window.location.search).get("lkActive");
    if (v === "true" || v === "false") setLkActiveFilter(v);
  }, []);

  useEffect(() => {
    return () => {
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const adminGoldPill =
    "border border-[var(--color-brand-gold)]/35 bg-[var(--color-brand-gold)]/12 text-[var(--color-brand-gold)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-[var(--color-brand-gold)]/50 hover:bg-[var(--color-brand-gold)]/18";

  const getRoleBadge = (role: string, layout: "table" | "mobile" = "table") => {
    const styles = {
      RECIPIENT: adminGoldPill,
      ADMIN: adminGoldPill,
      SUPERADMIN: adminGoldPill,
      ESTABLISHMENT_ADMIN: adminGoldPill,
      EMPLOYEE: adminGoldPill,
    };
    const labels = {
      RECIPIENT: "Получатель",
      ADMIN: "Админ",
      SUPERADMIN: "Суперадмин",
      ESTABLISHMENT_ADMIN: "Управляющий заведения",
      EMPLOYEE: "Официант",
    };
    const layoutClass =
      layout === "mobile"
        ? "max-w-full whitespace-normal break-words px-2.5 py-1 text-center text-[11px] leading-snug [overflow-wrap:anywhere]"
        : "whitespace-nowrap px-3 py-1 text-xs";
    return (
      <span
        className={`inline-block rounded-full font-medium ${layoutClass} ${styles[role as keyof typeof styles] || styles.RECIPIENT}`}
      >
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  const handleToggleBlocked = async (user: User) => {
    setUpdatingId(user.id);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isBlocked: !user.isBlocked }),
      });

      if (!res.ok) {
        setError("Ошибка обновления доступа");
        return;
      }

      await fetchUsers();
    } catch {
      setError("Ошибка обновления доступа");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBlockAll = async () => {
    if (!window.confirm("Заблокировать всех пользователей (кроме вас)? Это действие нельзя отменить одной кнопкой.")) {
      return;
    }
    setBlockAllLoading(true);
    setBlockAllError(null);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/admin/users/block-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBlockAllError((data as { error?: string }).error ?? "Ошибка блокировки");
        return;
      }
      await fetchUsers();
    } catch {
      setBlockAllError("Ошибка соединения");
    } finally {
      setBlockAllLoading(false);
    }
  };

  const handleCreateToken = async () => {
    setTokenLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/admin/registration-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (!res.ok) {
        setError("Ошибка создания токена");
        return;
      }
      const data = (await res.json()) as { token: string; link?: string; expiresAt: string; validHours?: number };
      const link = data.link ?? `${getBaseUrl()}/register?token=${encodeURIComponent(data.token)}`;
      setRegistrationLink(link);
      setLinkJustCopied(false);
    } catch {
      setError("Ошибка создания токена");
    } finally {
      setTokenLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!registrationLink) return;
    try {
      await navigator.clipboard.writeText(registrationLink);
      setLinkJustCopied(true);
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
      linkCopiedTimerRef.current = setTimeout(() => {
        setLinkJustCopied(false);
        linkCopiedTimerRef.current = null;
      }, 2200);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
  };

  const sortedUsers = useMemo(() => {
    const clientSortKeys = ["balance", "received", "transactions"];
    if (!clientSortKeys.includes(sortBy)) return users;
    const sorted = [...users].sort((a, b) => {
      const valA = sortBy === "balance" ? a.stats.balanceKop
        : sortBy === "received" ? a.stats.totalReceivedKop
        : a.stats.transactionsCount;
      const valB = sortBy === "balance" ? b.stats.balanceKop
        : sortBy === "received" ? b.stats.totalReceivedKop
        : b.stats.transactionsCount;
      return valA - valB;
    });
    return sortOrder === "desc" ? sorted.reverse() : sorted;
  }, [users, sortBy, sortOrder]);

  if (loading && users.length === 0) {
    return (
      <div className={ADMIN_PANEL_STATE_CENTER}>
        <div className="text-center text-[var(--color-muted)]">Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-6 flex flex-col items-center gap-1 text-center sm:mb-8">
        <h1 className={PANEL_PAGE_TITLE_ADMIN}>Пользователи</h1>
        <p className="max-w-lg text-sm text-white/75">Поиск по логину, email и коду официанта в ссылке оплаты.</p>
      </div>
      {error && (
        <div className="mb-6 rounded-xl border-0 bg-[var(--color-light-gray)] px-4 py-3 text-sm text-[var(--color-text)]">
          {error}
        </div>
      )}
      {blockAllError && (
        <div className="mb-6 rounded-xl border-0 bg-[var(--color-light-gray)] px-4 py-3 text-sm text-[var(--color-text)]">
          {blockAllError}
        </div>
      )}
      <div className="admin-users-toolbar mb-6 flex min-w-0 flex-col gap-3 sm:gap-3.5 lg:flex-row lg:items-start">
        <div className="relative w-full shrink-0 lg:max-w-md">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]"
            aria-hidden
          />
          <input
            type="text"
            placeholder="Логин, email или код оплаты"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-users-search-input h-9 w-full rounded-lg border-0 py-0 pl-9 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]/40"
          />
        </div>
        <div className="min-w-0 flex-1 text-sm text-[var(--color-text-secondary)]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={handleCreateToken}
              disabled={tokenLoading}
              className={`admin-users-token-btn ${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-2 px-3 py-2 text-[14px] font-semibold disabled:opacity-60`}
            >
              {tokenLoading ? "Создание..." : "Выдать токен регистрации"}
            </button>
            <button
              type="button"
              onClick={handleBlockAll}
              disabled={blockAllLoading}
              className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} gap-1.5 px-3 py-2 text-[14px] font-semibold`}
            >
              <Lock className="h-4 w-4" />
              {blockAllLoading ? "Выполняется..." : "Заблокировать всех"}
            </button>
            {registrationLink && (
              <button
                type="button"
                onClick={() => void handleCopyToken()}
                className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 ${linkJustCopied ? "admin-btn--success" : "admin-btn--neutral"}`}
                aria-label={linkJustCopied ? "Скопировано" : "Скопировать ссылку"}
              >
                {linkJustCopied ? (
                  <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                {linkJustCopied ? "Скопировано" : "Скопировать ссылку"}
              </button>
            )}
          </div>
          {registrationLink && (
            <div className="mt-2.5 flex items-stretch gap-2">
              <input
                type="text"
                readOnly
                value={registrationLink}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
                title="Кликните в поле — ссылка выделится, затем Ctrl+C"
                aria-label="Ссылка регистрации"
                className="admin-users-reg-link-field min-w-0 flex-1 cursor-text rounded-lg px-3 py-2 font-mono text-xs break-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={() => void handleCreateToken()}
                disabled={tokenLoading}
                title="Сгенерировать новую ссылку"
                aria-label="Сгенерировать новую ссылку"
                className={`${ADMIN_BTN} ${ADMIN_BTN_ICON} shrink-0 disabled:opacity-60`}
              >
                <RefreshCw className={`h-4 w-4 ${tokenLoading ? "animate-spin" : ""}`} aria-hidden />
              </button>
            </div>
          )}
          {registrationLink && (
            <div className="mt-2 text-xs text-[var(--color-muted)]">
              Одноразовая ссылка — действует только на одну регистрацию, без ограничения по времени.
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <div className="col-span-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)] sm:col-span-1 sm:w-auto">
          <Filter className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
          <span>Фильтры:</span>
        </div>
        <div className="min-w-0 sm:min-w-[10rem]">
          <CustomDropdown
            id="admin-users-role"
            variant="admin"
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="Все роли"
            options={[
              { value: "", label: "Все роли" },
              { value: "RECIPIENT", label: "Получатель" },
              { value: "ADMIN", label: "Админ" },
              { value: "ESTABLISHMENT_ADMIN", label: "Управляющий заведения" },
              { value: "EMPLOYEE", label: "Официант" },
            ]}
          />
        </div>
        <div className="min-w-0 sm:min-w-[10rem]">
          <CustomDropdown
            id="admin-users-blocked"
            variant="admin"
            value={blockedFilter}
            onChange={setBlockedFilter}
            placeholder="Все статусы"
            options={[
              { value: "", label: "Все статусы" },
              { value: "false", label: "Активные" },
              { value: "true", label: "Заблокированные" },
            ]}
          />
        </div>
        <div className="min-w-0 sm:min-w-[11rem]">
          <CustomDropdown
            id="admin-users-lk-active"
            variant="admin"
            value={lkActiveFilter}
            onChange={setLkActiveFilter}
            placeholder="В ЛК сейчас"
            options={[
              { value: "", label: "Все" },
              { value: "true", label: "Сейчас в ЛК" },
              { value: "false", label: "Не в ЛК" },
            ]}
          />
        </div>
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 sm:col-span-1 sm:w-auto">
          <ArrowUpDown className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
          <div className="min-w-0 flex-1 sm:min-w-[10rem] sm:flex-initial">
            <CustomDropdown
              id="admin-users-sort"
              variant="admin"
              value={sortBy}
              onChange={setSortBy}
              placeholder="По дате"
              options={[
                { value: "createdAt", label: "По дате" },
                { value: "login", label: "По логину" },
                { value: "balance", label: "По балансу" },
                { value: "received", label: "По получено" },
                { value: "transactions", label: "По транзакциям" },
              ]}
            />
          </div>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
            className={`${ADMIN_BTN} admin-btn--neutral px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm`}
          >
            {sortOrder === "desc" ? "↓ Убыв." : "↑ Возр."}
          </button>
        </div>
        {(roleFilter || blockedFilter || lkActiveFilter || sortBy !== "createdAt" || sortOrder !== "desc") && (
          <button
            type="button"
            onClick={() => {
              setRoleFilter("");
              setBlockedFilter("");
              setLkActiveFilter("");
              setSortBy("createdAt");
              setSortOrder("desc");
              setPage(0);
            }}
            className={`col-span-2 w-full sm:col-auto sm:w-auto ${ADMIN_BTN} ${ADMIN_BTN_SM} admin-btn--neutral`}
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Мобильная версия: карточки вместо таблицы */}
      {sortedUsers.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-secondary)] lg:hidden">Пользователей не найдено</p>
      ) : (
        sortedUsers.map((user) => (
          <div key={user.id} className="admin-users-mobile-card mb-3 flex flex-col gap-3 rounded-xl border p-4 lg:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/admin/users/${user.id}`}
                className={`${ADMIN_BTN} min-w-0 flex-1 px-3 py-2 text-sm font-medium break-all`}
              >
                {user.login}
              </Link>
              <span className="shrink-0 text-xs font-mono text-[var(--color-text-secondary)]">#{user.uniqueId}</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-sm text-[var(--color-text)]">
              <LkPresenceCell user={user} />
            </div>
            <div className="admin-users-mobile-fields grid gap-x-2 gap-y-1.5 text-sm [grid-template-columns:minmax(0,auto)_minmax(0,1fr)]">
              <span className="shrink-0 pt-0.5 text-[var(--color-text-secondary)]">Код оплаты</span>
              <div className="min-w-0 space-y-1.5 font-mono text-xs">
                {user.tipSlugs.length ? (
                  user.tipSlugs.map((slug) => (
                    <Link
                      key={slug}
                      href={`/pay/${encodeURIComponent(slug)}`}
                      className="block break-all text-[var(--color-brand-gold)] underline-offset-2 transition-opacity hover:underline hover:opacity-90"
                      title={`Оплата /pay/${slug}`}
                    >
                      {slug}
                    </Link>
                  ))
                ) : (
                  <span className="text-[var(--color-text)]">—</span>
                )}
              </div>
              <span className="shrink-0 pt-0.5 text-[var(--color-text-secondary)]">Email</span>
              <span className="min-w-0 truncate text-[var(--color-text)]" title={user.email || undefined}>
                {user.email || "—"}
              </span>
              <span className="shrink-0 self-start pt-1 text-[var(--color-text-secondary)]">Роль</span>
              <div className="admin-users-mobile-role -ml-1 min-w-0 max-w-full">
                {getRoleBadge(user.role, "mobile")}
              </div>
              <span className="shrink-0 text-[var(--color-text-secondary)]">Баланс</span>
              <span className="min-w-0 font-medium text-[var(--color-text)]">{formatMoneyCompact(user.stats.balanceKop)}</span>
              <span className="shrink-0 text-[var(--color-text-secondary)]">Получено</span>
              <span className="min-w-0 font-medium text-[var(--color-text)]">{formatMoneyCompact(user.stats.totalReceivedKop)}</span>
              <span className="shrink-0 text-[var(--color-text-secondary)]">Регистрация</span>
              <span className="min-w-0 text-[var(--color-text-secondary)]">{formatDate(user.createdAt)}</span>
            </div>
            <div className="admin-users-mobile-card-footer flex justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => handleToggleBlocked(user)}
                disabled={updatingId === user.id}
                className={`${ADMIN_BTN} ${ADMIN_BTN_SM} whitespace-nowrap font-semibold disabled:opacity-60 ${updatingId === user.id ? "opacity-60" : ""}`}
              >
                {user.isBlocked ? "Разблокировать" : "Ограничить"}
              </button>
            </div>
          </div>
        ))
      )}

      {/* Десктоп: таблица с горизонтальным скроллом */}
      <div className="admin-users-table cabinet-section-header overflow-x-auto rounded-xl border-0 max-lg:hidden">
        <table className="admin-users-data-table w-full min-w-[1120px] border-collapse">
          <thead className="bg-[var(--color-brand-gold)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">ID</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Логин</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Код оплаты</th>
              <th
                className="w-12 whitespace-nowrap px-3 py-3 text-left text-sm font-semibold text-[#0a192f]"
                aria-label="Присутствие в личном кабинете"
              />
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Email</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Роль</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Баланс</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Получено</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Транзакции</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">В ожидании вывода</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Дата регистрации</th>
              <th className="min-w-[7rem] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Доступ</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  Пользователей не найдено
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => (
                <tr key={user.id} className="admin-users-data-row transition-colors hover:bg-[var(--color-brand-gold)]/12">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-white/90">#{user.uniqueId}</td>
                  <td className="min-w-[120px] whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className={`${ADMIN_BTN} inline-block px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]/40`}
                    >
                      {user.login}
                    </Link>
                  </td>
                  <td
                    className="max-w-[200px] min-w-[100px] truncate px-4 py-3 font-mono text-sm text-white/90"
                    title={user.tipSlugs.length ? user.tipSlugs.join(", ") : undefined}
                  >
                    {user.tipSlugs.length ? user.tipSlugs.join(", ") : "—"}
                  </td>
                  <td className="w-12 whitespace-nowrap px-3 py-3">
                    <LkPresenceCell user={user} />
                  </td>
                  <td className="min-w-[140px] max-w-[180px] truncate px-4 py-3 text-sm text-white/90" title={user.email || undefined}>{user.email || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{getRoleBadge(user.role)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-white">{formatMoneyCompact(user.stats.balanceKop)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-white">{formatMoneyCompact(user.stats.totalReceivedKop)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-white/90">{user.stats.transactionsCount.toLocaleString("ru-RU")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-white/90">{user.stats.payoutsPendingCount.toLocaleString("ru-RU")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-white/80">{formatDate(user.createdAt)}</td>
                  <td className="min-w-[7rem] whitespace-nowrap px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleBlocked(user)}
                      disabled={updatingId === user.id}
                      className={`${ADMIN_BTN} ${ADMIN_BTN_SM} font-semibold disabled:opacity-60 whitespace-nowrap ${updatingId === user.id ? "opacity-60" : ""}`}
                    >
                      {user.isBlocked ? "Разблокировать" : "Ограничить"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {usersTotal > 0 && (
        <div className="mt-4 flex min-w-0 flex-col items-center justify-center gap-3 px-2 sm:flex-row sm:flex-wrap sm:gap-4">
          <p className="text-center text-sm text-[var(--color-text-secondary)]">
            Показано{" "}
            <span className="font-medium tabular-nums text-[var(--color-text)]">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, usersTotal)}
            </span>{" "}
            из{" "}
            <span className="font-medium tabular-nums text-[var(--color-text)]">{usersTotal}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className={`${ADMIN_BTN} ${ADMIN_BTN_SM} admin-btn--neutral min-w-[7rem] disabled:opacity-50`}
            >
              Назад
            </button>
            <span className="text-xs text-[var(--color-muted)] sm:text-sm">
              Страница{" "}
              <span className="font-semibold tabular-nums text-[var(--color-text)]">{page + 1}</span> /{" "}
              <span className="font-semibold tabular-nums text-[var(--color-text)]">
                {Math.max(1, Math.ceil(usersTotal / PAGE_SIZE))}
              </span>
            </span>
            <button
              type="button"
              disabled={loading || (page + 1) * PAGE_SIZE >= usersTotal}
              onClick={() => setPage((p) => p + 1)}
              className={`${ADMIN_BTN} ${ADMIN_BTN_SM} admin-btn--neutral min-w-[7rem] disabled:opacity-50`}
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
