"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Copy, RefreshCw } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

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
  const [createdLink, setCreatedLink] = useState<{ id: string; name: string; link: string } | null>(null);
  const [linkByEstId, setLinkByEstId] = useState<Record<string, string>>({});
  const [loadingTokenId, setLoadingTokenId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    uniqueSlug: "",
    maxEmployeesCount: "" as string | number,
  });

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/establishments", { headers: authHeaders() });
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
      const res = await fetch("/api/admin/establishments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || undefined,
          phone: form.phone.trim() || undefined,
          uniqueSlug: form.uniqueSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
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
      });
      setLinkByEstId((prev) => ({ ...prev, [data.establishment.id]: data.registrationLink }));
      setForm({ name: "", address: "", phone: "", uniqueSlug: "", maxEmployeesCount: "" });
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
      const res = await fetch(`/api/admin/establishments/${estId}/registration-token`, {
        method: "POST",
        headers: authHeaders(),
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
    return (
      <div className="text-white/90">Загрузка…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white">
          Заведения
        </h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 font-medium text-[#0a192f] hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Создать заведение
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">{error}</p>
      )}

      {createdLink && (
        <div className="rounded-2xl border border-white/10 bg-[#0a192f] p-4">
          <p className="mb-2 text-white font-medium">
            Заведение «{createdLink.name}» создано. Ссылка для регистрации управляющего:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={createdLink.link}
              className="min-w-[200px] flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => copyLink(createdLink.link)}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
            >
              <Copy className="h-4 w-4" /> Копировать
            </button>
          </div>
          <p className="mt-2 text-sm text-white/70">
            Отправьте ссылку будущему управляющему. Один токен = одна регистрация. При необходимости можно перегенерировать ссылку в таблице ниже.
          </p>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-white/10 bg-[#0a192f] p-6 space-y-4"
        >
          <h2 className="text-lg font-medium text-white">Новое заведение</h2>
          {formError && (
            <p className="text-sm text-red-300">{formError}</p>
          )}
          <div>
            <label className="block text-sm text-white/80 mb-1">Название *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-1">Slug для URL * (латиница, цифры, дефис)</label>
            <input
              type="text"
              required
              value={form.uniqueSlug}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  uniqueSlug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                }))
              }
              placeholder="momo-pizza"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-1">Адрес</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-1">Телефон</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-1">Лимит сотрудников (официантов)</label>
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
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
            <p className="mt-1 text-xs text-white/60">
              Больше этого числа управляющий не сможет подключить официантов.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[var(--color-brand-gold)] px-4 py-2 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Создание…" : "Создать и получить ссылку"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/20"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a192f]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 font-medium text-white">Название</th>
              <th className="p-3 font-medium text-white">Slug</th>
              <th className="p-3 font-medium text-white">Лимит сотрудников</th>
              <th className="p-3 font-medium text-white">Сотрудников</th>
              <th className="p-3 font-medium text-white">Управляющих</th>
              <th className="p-3 font-medium text-white">Ссылка для управляющего</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-white/60">
                  Нет заведений. Создайте первое.
                </td>
              </tr>
            ) : (
              list.map((est) => (
                <tr key={est.id} className="border-b border-white/5">
                  <td className="p-3 text-white">{est.name}</td>
                  <td className="p-3 text-white/80 font-mono text-sm">{est.uniqueSlug}</td>
                  <td className="p-3 text-white/80">
                    {est.maxEmployeesCount == null ? "—" : est.maxEmployeesCount}
                  </td>
                  <td className="p-3 text-white/80">{est.employeesCount}</td>
                  <td className="p-3 text-white/80">{est.adminsCount}</td>
                  <td className="p-3">
                    {linkByEstId[est.id] ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyLink(linkByEstId[est.id])}
                          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white hover:bg-white/20"
                        >
                          <Copy className="h-3 w-3" /> Копировать
                        </button>
                        <button
                          type="button"
                          onClick={() => getOrRegenerateToken(est.id)}
                          disabled={loadingTokenId === est.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1.5 text-xs text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${loadingTokenId === est.id ? "animate-spin" : ""}`}
                          />{" "}
                          Сменить токен
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => getOrRegenerateToken(est.id)}
                        disabled={loadingTokenId === est.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-brand-gold)]/80 px-2 py-1.5 text-xs text-[#0a192f] hover:bg-[var(--color-brand-gold)] disabled:opacity-50"
                      >
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
