"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Search, Copy, Filter, ArrowUpDown, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { getCsrfHeader } from "@/lib/security/csrf-client";
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
      <span className="inline-flex max-w-[9rem] items-center gap-2 text-white/65" title={title}>
        <LkPresenceDot online={false} />
        <span className="truncate text-xs">{formatRelativeTimeAgo(user.lastSeenAt)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-white/40" title={title}>
      <LkPresenceDot online={false} />
      <span className="text-xs">—</span>
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
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
  const [blockAllLoading, setBlockAllLoading] = useState(false);
  const [blockAllError, setBlockAllError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const qp = new URLSearchParams();
      if (search) qp.set("search", search);
      if (roleFilter) qp.set("role", roleFilter);
      if (blockedFilter) qp.set("blocked", blockedFilter);
      if (lkActiveFilter === "true" || lkActiveFilter === "false") qp.set("lkActive", lkActiveFilter);
      if (sortBy) qp.set("sortBy", sortBy);
      if (sortOrder) qp.set("sortOrder", sortOrder);
      const qs = qp.toString();
      const url = `/api/admin/users${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Ошибка загрузки пользователей");
        return;
      }

      const data: UsersResponse = await res.json();
      setUsers(data.users);
    } catch {
      setError("Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, blockedFilter, lkActiveFilter, sortBy, sortOrder]);

  useLayoutEffect(() => {
    const v = new URLSearchParams(window.location.search).get("lkActive");
    if (v === "true" || v === "false") setLkActiveFilter(v);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const adminGoldPill =
    "border border-[var(--color-brand-gold)]/35 bg-[var(--color-brand-gold)]/12 text-[var(--color-brand-gold)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-[var(--color-brand-gold)]/50 hover:bg-[var(--color-brand-gold)]/18";

  const getRoleBadge = (role: string) => {
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
    return (
      <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${styles[role as keyof typeof styles] || styles.RECIPIENT}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  const handleToggleBlocked = async (user: User) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setUpdatingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
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
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    if (!window.confirm("Заблокировать всех пользователей (кроме вас)? Это действие нельзя отменить одной кнопкой.")) {
      return;
    }
    setBlockAllLoading(true);
    setBlockAllError(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/block-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
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
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setTokenLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/registration-tokens", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
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
    } catch {
      setError("Не удалось скопировать токен");
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
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white sm:text-2xl">Пользователи</h1>
        <p className="max-w-lg text-sm text-white/75">Поиск по логину, email и платёжной ссылке (slug).</p>
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

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="relative flex max-w-md items-center">
          <Search className="pointer-events-none absolute left-3 h-5 w-5 text-white/80" style={{top:"50%",transform:"translateY(-50%)"}} />
          <input
            type="text"
            placeholder="Логин, email или slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-users-search-input cabinet-section-header w-full rounded-xl border-0 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/70 focus:outline-none"
          />
        </div>
        <div className="cabinet-section-header rounded-2xl border-0 bg-[var(--color-light-gray)] p-4 text-sm text-[var(--color-text-secondary)]">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCreateToken}
              disabled={tokenLoading}
              className={`admin-users-token-btn ${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-2 px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60`}
            >
              {tokenLoading ? "Создание..." : "Выдать токен регистрации"}
            </button>
            <button
              type="button"
              onClick={handleBlockAll}
              disabled={blockAllLoading}
              className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} gap-1.5 px-4 py-2.5 text-[14px] font-semibold`}
            >
              <Lock className="h-4 w-4" />
              {blockAllLoading ? "Выполняется..." : "Заблокировать всех"}
            </button>
            {registrationLink && (
              <button
                type="button"
                onClick={handleCopyToken}
                className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 admin-btn--neutral`}
              >
                <Copy className="h-4 w-4" />
                Скопировать ссылку
              </button>
            )}
          </div>
          {registrationLink && (
            <div className="mt-3 flex items-stretch gap-2">
              <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white/90 break-all">
                {registrationLink}
              </div>
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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-white/90">
          <Filter className="h-4 w-4" />
          <span>Фильтры:</span>
        </div>
        <div className="min-w-[10rem]">
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
        <div className="min-w-[10rem]">
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
        <div className="min-w-[11rem]">
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
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-white/80" />
          <div className="min-w-[10rem]">
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
            className={`cabinet-section-header ${ADMIN_BTN} admin-btn--neutral px-3 py-2 text-sm`}
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
            }}
            className={`cabinet-section-header ${ADMIN_BTN} ${ADMIN_BTN_SM} admin-btn--neutral`}
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Мобильная версия: карточки вместо таблицы */}
      <div className="cabinet-section-header space-y-3 rounded-xl border-0 p-4 lg:hidden">
        {sortedUsers.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/90">Пользователей не найдено</p>
        ) : (
          sortedUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[var(--color-dark-gray)]/20 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/admin/users/${user.id}`}
                  className={`${ADMIN_BTN} min-w-0 flex-1 px-3 py-2 text-sm font-medium break-all`}
                >
                  {user.login}
                </Link>
                <span className="shrink-0 text-xs font-mono text-white/70">#{user.uniqueId}</span>
              </div>
              <div className="flex items-center justify-end gap-2 text-sm">
                <LkPresenceCell user={user} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-white/60">Slug</span>
                <div className="min-w-0 space-y-1.5 font-mono text-xs">
                  {user.tipSlugs.length ? (
                    user.tipSlugs.map((slug) => (
                      <Link
                        key={slug}
                        href={`/pay/${encodeURIComponent(slug)}`}
                        className="block break-all text-[var(--color-brand-gold)] underline-offset-2 transition-opacity hover:underline hover:opacity-90"
                        title={`Страница оплаты /pay/${slug}`}
                      >
                        {slug}
                      </Link>
                    ))
                  ) : (
                    <span className="text-white/90">—</span>
                  )}
                </div>
                <span className="text-white/60">Email</span>
                <span className="min-w-0 truncate text-white/90" title={user.email || undefined}>{user.email || "—"}</span>
                <span className="text-white/60">Роль</span>
                <span>{getRoleBadge(user.role)}</span>
                <span className="text-white/60">Баланс</span>
                <span className="text-white">{formatMoneyCompact(user.stats.balanceKop)}</span>
                <span className="text-white/60">Получено</span>
                <span className="text-white">{formatMoneyCompact(user.stats.totalReceivedKop)}</span>
                <span className="text-white/60">Регистрация</span>
                <span className="text-white/80">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex justify-end border-t border-white/10 pt-3">
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
      </div>

      {/* Десктоп: таблица с горизонтальным скроллом */}
      <div className="admin-users-table cabinet-section-header overflow-x-auto rounded-xl border-0 max-lg:hidden">
        <table className="w-full min-w-[1120px]">
          <thead className="border-0 bg-[var(--color-brand-gold)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">ID</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Логин</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">Slug</th>
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
                <td colSpan={12} className="px-4 py-8 text-center text-white/90">
                  Пользователей не найдено
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => (
                <tr key={user.id} className="border-0 hover:bg-[var(--color-brand-gold)]/15 transition-colors">
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
    </div>
  );
}
