"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";
import { EstablishmentDataGridPlaceholder } from "@/components/establishment/EstablishmentDataGridPlaceholder";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceKop: string;
  sortOrder: number;
}

interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export default function EstablishmentMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [itemForms, setItemForms] = useState<Record<string, { name: string; priceRub: string; desc: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/establishment/menu", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка загрузки");
        return;
      }
      setCategories(data.categories ?? []);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await fetch("/api/establishment/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка");
        return;
      }
      setNewCatName("");
      await load();
    } catch {
      setError("Ошибка соединения");
    }
  };

  const removeCategory = async (id: string) => {
    if (!confirm("Удалить категорию и все позиции?")) return;
    try {
      const res = await fetch(`/api/establishment/menu/categories/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка");
        return;
      }
      await load();
    } catch {
      setError("Ошибка соединения");
    }
  };

  const addItem = async (categoryId: string) => {
    const f = itemForms[categoryId] ?? { name: "", priceRub: "", desc: "" };
    if (!f.name.trim()) return;
    const rub = parseFloat(f.priceRub.replace(",", "."));
    if (!Number.isFinite(rub) || rub < 0) {
      setError("Укажите цену в рублях");
      return;
    }
    const priceKop = Math.round(rub * 100);
    try {
      const res = await fetch("/api/establishment/menu/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          categoryId,
          name: f.name.trim(),
          description: f.desc.trim() || undefined,
          priceKop,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка");
        return;
      }
      setItemForms((prev) => ({ ...prev, [categoryId]: { name: "", priceRub: "", desc: "" } }));
      await load();
    } catch {
      setError("Ошибка соединения");
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm("Удалить позицию?")) return;
    try {
      const res = await fetch(`/api/establishment/menu/items/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Ошибка");
        return;
      }
      await load();
    } catch {
      setError("Ошибка соединения");
    }
  };

  const formatPrice = (kopStr: string) => {
    const k = BigInt(kopStr || "0");
    const rub = Number(k) / 100;
    return rub.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ₽";
  };

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3">
      <div className="ft-panel-section-head min-w-0">
        <Link
          href="/establishment/operations"
          className="inline-flex items-center justify-center gap-1 text-sm text-[var(--color-on-dark-muted)] hover:text-[var(--color-on-dark)]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Зал и сервис
        </Link>
        <h1 className="cabinet-dashboard-name-hero font-[family:var(--font-playfair)] text-[var(--color-on-dark)]">
          Меню
        </h1>
        <p className="ft-panel-section-head__lead text-sm text-[var(--color-on-dark-muted)]">
          Категории и позиции. Цены в рублях; на сервере хранятся в копейках.
        </p>
      </div>
      {error ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-3 text-center text-red-100">
          <span>{error}</span>
          <button type="button" className="underline" onClick={() => setError(null)}>
            Скрыть
          </button>
        </div>
      ) : null}
      <form
        onSubmit={addCategory}
        className="ft-panel-section-toolbar ft-panel-section-toolbar--row gap-1.5 rounded-lg border border-[var(--color-brand-gold)]/30 bg-[var(--establishment-charcoal)] p-2"
      >
        <input
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Новая категория"
          className="min-w-[10rem] w-52 max-w-full shrink rounded-md border border-[var(--color-brand-gold)]/25 bg-white/[0.08] px-2 py-1 text-sm text-[var(--color-on-dark)] sm:w-56 sm:text-left"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-[var(--color-brand-gold)] px-2.5 py-1 text-[11px] font-semibold text-[#0a192f]"
        >
          <Plus className="h-3.5 w-3.5" />
          Добавить категорию
        </button>
      </form>
      {loading ? (
        <EstablishmentDataGridPlaceholder
          loading
          rows={4}
          columns={[
            { label: "Категория", colClassName: "min-w-[5.5rem]" },
            { label: "Позиция", colClassName: "min-w-[7rem] w-full" },
            { label: "Цена", colClassName: "min-w-[4rem] text-right sm:text-left" },
          ]}
          footerNote="Загрузка…"
        />
      ) : categories.length === 0 ? (
        <EstablishmentDataGridPlaceholder
          rows={4}
          columns={[
            { label: "Категория", colClassName: "min-w-[5.5rem]" },
            { label: "Позиция", colClassName: "min-w-[7rem] w-full" },
            { label: "Цена", colClassName: "min-w-[4rem] text-right sm:text-left" },
          ]}
          footerNote="Добавьте категорию выше — здесь появятся блоки с позициями меню."
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {categories.map((c) => {
            const f = itemForms[c.id] ?? { name: "", priceRub: "", desc: "" };
            const fieldClass =
              "w-full rounded-md border border-[var(--color-brand-gold)]/25 bg-white/[0.08] px-2 py-1 text-[11px] leading-tight text-[var(--color-on-dark)] placeholder:text-[var(--color-on-dark-muted)]";
            return (
              <section
                key={c.id}
                className="rounded-md border border-[var(--color-brand-gold)]/25 bg-[var(--establishment-charcoal)] p-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <h2 className="text-xs font-semibold text-[var(--color-on-dark)]">{c.name}</h2>
                  <button
                    type="button"
                    onClick={() => removeCategory(c.id)}
                    className="rounded-md p-1 text-[var(--color-on-dark-muted)] hover:bg-red-500/25 hover:text-red-100"
                    aria-label="Удалить категорию"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {c.items.map((it) => (
                    <li
                      key={it.id}
                      className="flex flex-wrap items-center justify-between gap-1.5 border-t border-[var(--color-brand-gold)]/12 pt-1.5 first:border-t-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--color-on-dark)]">{it.name}</p>
                        {it.description ? (
                          <p className="text-[11px] leading-snug text-[var(--color-on-dark-muted)]">{it.description}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-[11px] font-medium text-[var(--color-brand-gold)]">{formatPrice(it.priceKop)}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          className="rounded-md p-0.5 text-[var(--color-on-dark-muted)] hover:bg-red-500/25"
                          aria-label="Удалить"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-1.5 border-t border-[var(--color-brand-gold)]/15 pt-1.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-stretch sm:gap-1.5">
                    <input
                      placeholder="Название позиции"
                      value={f.name}
                      onChange={(e) => setItemForms((prev) => ({ ...prev, [c.id]: { ...f, name: e.target.value } }))}
                      className={`${fieldClass} min-w-0 sm:flex-1`}
                    />
                    <input
                      placeholder="Цена, ₽"
                      inputMode="decimal"
                      value={f.priceRub}
                      onChange={(e) => setItemForms((prev) => ({ ...prev, [c.id]: { ...f, priceRub: e.target.value } }))}
                      className={`${fieldClass} sm:w-[6.25rem] sm:flex-none`}
                    />
                  </div>
                  <input
                    placeholder="Описание (необяз.)"
                    value={f.desc}
                    onChange={(e) => setItemForms((prev) => ({ ...prev, [c.id]: { ...f, desc: e.target.value } }))}
                    className={`${fieldClass} mt-1`}
                  />
                  <button
                    type="button"
                    onClick={() => addItem(c.id)}
                    className="mt-1.5 inline-flex w-full items-center justify-center rounded-md bg-[var(--color-brand-gold)]/90 px-2.5 py-1 text-[11px] font-semibold text-[#0a192f] sm:w-auto sm:self-start"
                  >
                    Добавить позицию
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
