"use client";

import { useEffect, useState } from "react";
import { Plus, Copy, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth-client";
import { ADMIN_BTN, ADMIN_BTN_NEUTRAL_SM, ADMIN_BTN_PRIMARY, ADMIN_BTN_SM } from "@/lib/admin-button-classes";
import { ADMIN_PANEL_INPUT_FULL_WIDTH, ADMIN_PANEL_INPUT_STRETCH } from "@/lib/admin-surface-classes";
import {
  PANEL_ADMIN_ESTABLISHMENTS_TABLE_WRAP,
  PANEL_PAGE_TITLE_ADMIN_ON_DARK_CENTERED,
  PANEL_SECTION_CARD_FORM_SPACE,
  PANEL_SECTION_CARD_P4,
  PANEL_SECTION_CARD_ROUNDED_XL_P4,
  PANEL_SECTION_CARD_ROUNDED_XL_P6_CENTERED,
} from "@/lib/panel-shell-visual-classes";

interface EstablishmentRow {
  id: string;
  name: string;
  uniqueSlug: string;
  maxEmployeesCount: number | null;
  employeesCount: number;
  adminsCount: number;
  createdAt: string;
}

export default function AdminEstablishmentsPage() {
  const [list, setList] = useState<EstablishmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<{
    id: string;
    name: string;
    link: string;
    waiterCode: string;
  } | null>(null);
  const [linkByEstId, setLinkByEstId] = useState<Record<string, string>>({});
  const [loadingTokenId, setLoadingTokenId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    maxEmployeesCount: "" as string | number,
  });

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/admin/establishments");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d?.error ?? "Ошибка загрузки");
        return;
      }
      const data = await res.json();
      setList(data.establishments ?? []);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const max =
        form.maxEmployeesCount === ""
          ? undefined
          : Number(form.maxEmployeesCount);
      if (
        form.maxEmployeesCount !== "" &&
        (max === undefined || Number.isNaN(max) || max < 0)
      ) {
        setFormError("Лимит сотрудников — целое число ≥ 0");
        setSubmitting(false);
        return;
      }
      const res = await fetchWithAuth("/api/admin/establishments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || undefined,
          phone: form.phone.trim() || undefined,
          maxEmployeesCount: max,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error ?? "Ошибка создания");
        setSubmitting(false);
        return;
      }
      setCreatedLink({
        id: data.establishment.id,
        name: data.establishment.name,
        link: data.registrationLink,
        waiterCode: data.establishment.uniqueSlug,
      });
      setLinkByEstId((prev) => ({ ...prev, [data.establishment.id]: data.registrationLink }));
      setForm({ name: "", address: "", phone: "", maxEmployeesCount: "" });
      setShowForm(false);
      fetchList();
    } catch {
      setFormError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  };

  const getOrRegenerateToken = async (estId: string) => {
    setLoadingTokenId(estId);
    try {
      const res = await fetchWithAuth(`/api/admin/establishments/${estId}/registration-token`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Ошибка");
        return;
      }
      setLinkByEstId((prev) => ({ ...prev, [estId]: data.registrationLink }));
    } catch {
      alert("Ошибка соединения");
    } finally {
      setLoadingTokenId(null);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => alert("Ссылка скопирована"));
  };

  if (loading) {
    return <div className="text-[var(--color-on-dark)]">Загрузка…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={PANEL_PAGE_TITLE_ADMIN_ON_DARK_CENTERED}>Заведения</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-2 px-4 py-2.5 font-medium`}
        >
          <Plus className="h-5 w-5" />
          Создать заведение
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">{error}</p>
      )}

      {createdLink && (
        <div className={PANEL_SECTION_CARD_P4}>
          <p className="mb-2 font-medium text-[var(--color-on-dark)]">
            Заведение «{createdLink.name}» создано. Код заведения (общий пул /pay):{" "}
            <span className="font-mono tracking-wide">{createdLink.waiterCode}</span>
          </p>
          <p className="mb-2 text-sm text-[var(--color-on-dark-muted)]">
            Ссылка для регистрации управляющего:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={createdLink.link}
              className={`min-w-[200px] flex-1 ${ADMIN_PANEL_INPUT_STRETCH}`}
            />
            <button
              type="button"
              onClick={() => copyLink(createdLink.link)}
              className={`${ADMIN_BTN} admin-btn--neutral gap-1 px-3 py-2 text-sm`}
            >
              <Copy className="h-4 w-4" /> Копировать
            </button>
          </div>
          <p className="mt-2 text-sm text-[var(--color-on-dark-muted)]">
            Отправьте ссылку будущему управляющему. Один токен = одна регистрация. При необходимости можно перегенерировать ссылку в таблице ниже.
          </p>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className={PANEL_SECTION_CARD_FORM_SPACE}
        >
          <h2 className="text-lg font-medium text-[var(--color-on-dark)]">Новое заведение</h2>
          {formError && (
            <p className="text-sm text-red-300">{formError}</p>
          )}
          <div>
            <label className="mb-1 block text-sm text-[var(--color-on-dark-muted)]">Название *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={ADMIN_PANEL_INPUT_FULL_WIDTH}
            />
          </div>
          <p className="text-sm text-[var(--color-on-dark-muted)]">
            Код заведения для оплаты (/pay/…) и общего пула назначается автоматически из общей порядковой нумерации (как у официантов).
          </p>
          <div>
            <label className="mb-1 block text-sm text-[var(--color-on-dark-muted)]">Адрес</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className={ADMIN_PANEL_INPUT_FULL_WIDTH}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--color-on-dark-muted)]">Телефон</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={ADMIN_PANEL_INPUT_FULL_WIDTH}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--color-on-dark-muted)]">
              Лимит сотрудников (официантов)
            </label>
            <input
              type="number"
              min={0}
              value={form.maxEmployeesCount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  maxEmployeesCount: e.target.value === "" ? "" : e.target.value,
                }))
              }
              placeholder="Пусто = без лимита"
              className={ADMIN_PANEL_INPUT_FULL_WIDTH}
            />
            <p className="mt-1 text-xs text-[var(--color-on-dark-muted)]">
              Больше этого числа управляющий не сможет подключить официантов.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} px-4 py-2 disabled:opacity-50`}
            >
              {submitting ? "Создание…" : "Создать и получить ссылку"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={`${ADMIN_BTN} admin-btn--neutral px-4 py-2`}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Мобильная версия: карточки */}
      <div className="space-y-4 lg:hidden">
        {list.length === 0 ? (
          <div className={PANEL_SECTION_CARD_ROUNDED_XL_P6_CENTERED}>
            Нет заведений. Создайте первое.
          </div>
        ) : (
          list.map((est) => (
            <div key={est.id} className={PANEL_SECTION_CARD_ROUNDED_XL_P4}>
              <p className="font-medium text-[var(--color-on-dark)]">{est.name}</p>
              <p className="mt-1 font-mono text-sm text-[var(--color-on-dark-muted)]">{est.uniqueSlug}</p>
              <p className="mt-2 text-sm text-[var(--color-on-dark-muted)]">
                Сотрудников: {est.employeesCount}
                {est.maxEmployeesCount != null ? ` / ${est.maxEmployeesCount}` : ""} · Управляющих:{" "}
                {est.adminsCount}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/15 pt-3">
                {linkByEstId[est.id] ? (
                  <>
                    <button type="button" onClick={() => copyLink(linkByEstId[est.id])} className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1`}>
                      <Copy className="h-3 w-3" /> Копировать
                    </button>
                    <button type="button" onClick={() => getOrRegenerateToken(est.id)} disabled={loadingTokenId === est.id} className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 disabled:opacity-50`}>
                      <RefreshCw className={`h-3 w-3 ${loadingTokenId === est.id ? "animate-spin" : ""}`} /> Сменить токен
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => getOrRegenerateToken(est.id)} disabled={loadingTokenId === est.id} className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} ${ADMIN_BTN_SM} gap-1 disabled:opacity-50`}>
                    {loadingTokenId === est.id ? "…" : "Получить ссылку"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Десктоп: таблица */}
      <div className={PANEL_ADMIN_ESTABLISHMENTS_TABLE_WRAP}>
        <table className="w-full min-w-[700px] text-left">
          <thead>
            <tr className="border-b border-white/15">
              <th className="whitespace-nowrap p-3 font-medium text-[var(--color-on-dark)]">Название</th>
              <th className="whitespace-nowrap p-3 font-medium text-[var(--color-on-dark)]">Код (пул)</th>
              <th className="whitespace-nowrap p-3 font-medium text-[var(--color-on-dark)]">Лимит сотрудников</th>
              <th className="whitespace-nowrap p-3 font-medium text-[var(--color-on-dark)]">Сотрудников</th>
              <th className="whitespace-nowrap p-3 font-medium text-[var(--color-on-dark)]">Управляющих</th>
              <th className="whitespace-nowrap p-3 font-medium text-[var(--color-on-dark)]">
                Ссылка для управляющего
              </th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--color-on-dark-muted)]">
                  Нет заведений. Создайте первое.
                </td>
              </tr>
            ) : (
              list.map((est) => (
                <tr key={est.id} className="border-b border-white/10">
                  <td className="whitespace-nowrap p-3 text-[var(--color-on-dark)]">{est.name}</td>
                  <td className="whitespace-nowrap p-3 font-mono text-sm text-[var(--color-on-dark-muted)]">
                    {est.uniqueSlug}
                  </td>
                  <td className="whitespace-nowrap p-3 text-[var(--color-on-dark-muted)]">
                    {est.maxEmployeesCount == null ? "—" : est.maxEmployeesCount}
                  </td>
                  <td className="whitespace-nowrap p-3 text-[var(--color-on-dark-muted)]">{est.employeesCount}</td>
                  <td className="whitespace-nowrap p-3 text-[var(--color-on-dark-muted)]">{est.adminsCount}</td>
                  <td className="p-3">
                    {linkByEstId[est.id] ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => copyLink(linkByEstId[est.id])} className={`${ADMIN_BTN} ${ADMIN_BTN_NEUTRAL_SM} gap-1 px-2 py-1.5`}>
                          <Copy className="h-3 w-3" /> Копировать
                        </button>
                        <button type="button" onClick={() => getOrRegenerateToken(est.id)} disabled={loadingTokenId === est.id} className={`${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1 px-2 py-1.5 disabled:opacity-50`}>
                          <RefreshCw className={`h-3 w-3 ${loadingTokenId === est.id ? "animate-spin" : ""}`} /> Сменить токен
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => getOrRegenerateToken(est.id)} disabled={loadingTokenId === est.id} className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} ${ADMIN_BTN_SM} gap-1 disabled:opacity-50`}>
                        {loadingTokenId === est.id ? "…" : "Получить ссылку"}
                      </button>
                    )}
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
