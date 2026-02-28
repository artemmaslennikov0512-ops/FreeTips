"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Copy, Filter, ArrowUpDown, Lock } from "lucide-react";
import Link from "next/link";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { getBaseUrl } from "@/lib/get-base-url";
import { formatDate, formatMoneyCompact } from "@/lib/utils";

interface User {
  id: string;
  uniqueId: number;
  login: string;
  email: string | null;
  role: string;
  createdAt: string;
  isBlocked: boolean;
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [blockedFilter, setBlockedFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
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
  }, [search, roleFilter, blockedFilter, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const getRoleBadge = (role: string) => {
    const styles = {
      RECIPIENT: "bg-[var(--color-dark-gray)]/50 text-white border border-white/20",
      ADMIN: "bg-[var(--color-dark-gray)]/50 text-white border border-white/20",
      SUPERADMIN: "bg-[var(--color-dark-gray)]/50 text-white border border-white/20",
    };
    const labels = {
      RECIPIENT: "Получатель",
      ADMIN: "Админ",
      SUPERADMIN: "Суперадмин",
    };
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[role as keyof typeof styles] || styles.RECIPIENT}`}>
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
      setTokenExpiresAt(data.expiresAt);
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-[var(--color-muted)]">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
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
          <Search className="pointer-events-none absolute left-3 h-5 w-5 text-[var(--color-muted)]" style={{top:"50%",transform:"translateY(-50%)"}} />
          <input
            type="text"
            placeholder="Поиск по логину или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cabinet-section-header w-full rounded-xl border-0 py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none"
          />
        </div>
        <div className="cabinet-section-header rounded-2xl border-0 bg-[var(--color-light-gray)] p-4 text-sm text-[var(--color-text-secondary)]">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCreateToken}
              disabled={tokenLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#0a192f] transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {tokenLoading ? "Создание..." : "Выдать токен регистрации"}
            </button>
            <button
              type="button"
              onClick={handleBlockAll}
              disabled={blockAllLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border-0 bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              {blockAllLoading ? "Выполняется..." : "Заблокировать всех"}
            </button>
            {registrationLink && (
              <button
                type="button"
                onClick={handleCopyToken}
                className="flex items-center gap-1 rounded-lg border-0 px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-light-gray)]"
              >
                <Copy className="h-4 w-4" />
                Скопировать ссылку
              </button>
            )}
          </div>
          {registrationLink && (
            <div className="mt-3 rounded-lg border-0 bg-[var(--color-light-gray)] px-3 py-2 font-mono text-xs text-[var(--color-text)]">
              {registrationLink}
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
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <Filter className="h-4 w-4" />
          <span>Фильтры:</span>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg cabinet-section-header border-0 px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:outline-none"
        >
          <option value="">Все роли</option>
          <option value="RECIPIENT">Получатель</option>
          <option value="ADMIN">Админ</option>
        </select>
        <select
          value={blockedFilter}
          onChange={(e) => setBlockedFilter(e.target.value)}
          className="rounded-lg cabinet-section-header border-0 px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:outline-none"
        >
          <option value="">Все статусы</option>
          <option value="false">Активные</option>
          <option value="true">Заблокированные</option>
        </select>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-[var(--color-muted)]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg cabinet-section-header border-0 px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:outline-none"
          >
            <option value="createdAt">По дате</option>
            <option value="login">По логину</option>
            <option value="balance">По балансу</option>
            <option value="received">По получено</option>
            <option value="transactions">По транзакциям</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
            className="rounded-lg cabinet-section-header border-0 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-light-gray)] transition-colors"
          >
            {sortOrder === "desc" ? "↓ Убыв." : "↑ Возр."}
          </button>
        </div>
        {(roleFilter || blockedFilter || sortBy !== "createdAt" || sortOrder !== "desc") && (
          <button
            type="button"
            onClick={() => { setRoleFilter(""); setBlockedFilter(""); setSortBy("createdAt"); setSortOrder("desc"); }}
            className="cabinet-section-header rounded-lg border-0 px-3 py-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-light-gray)] transition-colors"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="cabinet-section-header overflow-x-auto rounded-xl border-0">
        <table className="w-full">
          <thead className="border-0 bg-[var(--color-brand-gold)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                ID
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Логин
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Роль
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Баланс
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Получено
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Транзакции
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                В ожидании вывода
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Дата регистрации
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#0a192f]">
                Доступ
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-white/90">
                  Пользователей не найдено
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => (
                <tr key={user.id} className="border-0 hover:bg-[var(--color-brand-gold)]/15 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-white/90">
                    #{user.uniqueId}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="inline-block rounded-xl border border-white/25 bg-[var(--color-dark-gray)]/50 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-dark-gray)]/70 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    >
                      {user.login}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/90">
                    {user.email || "—"}
                  </td>
                  <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                  <td className="px-4 py-3 text-sm text-white">
                    {formatMoneyCompact(user.stats.balanceKop)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white">
                    {formatMoneyCompact(user.stats.totalReceivedKop)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/90">
                    {user.stats.transactionsCount.toLocaleString("ru-RU")}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/90">
                    {user.stats.payoutsPendingCount.toLocaleString("ru-RU")}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleBlocked(user)}
                      disabled={updatingId === user.id}
                      className={`rounded-lg border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors bg-[var(--color-dark-gray)]/50 hover:bg-[var(--color-dark-gray)]/70 disabled:opacity-60 ${updatingId === user.id ? "opacity-60" : ""}`}
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
