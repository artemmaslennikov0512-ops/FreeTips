"use client";

import { useEffect, useState } from "react";
import { PieChart, Plus, Pencil, Trash2 } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";
import { CustomDropdown } from "@/components/CustomDropdown";

interface PayoutRule {
  id: string;
  name: string;
  type: string;
  value: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  establishment_share: "Доля заведения",
  charity: "В фонд / благотворительность",
};

export default function PayoutRulesPage() {
  const [rules, setRules] = useState<PayoutRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"establishment_share" | "charity">("establishment_share");
  const [formValue, setFormValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async () => {
    const res = await fetch("/api/establishment/payout-rules", {
      headers: authHeaders(),
    });
    if (!res.ok) {
      setError("Ошибка загрузки");
      return;
    }
    const data = await res.json();
    setRules(data.rules ?? []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      await fetchRules();
      setLoading(false);
    };
    load();
  }, []);

  const hasEstablishmentShare = rules.some((r) => r.type === "establishment_share");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const valueNum = parseFloat(formValue.replace(",", "."));
    if (Number.isNaN(valueNum) || valueNum < 0 || valueNum > 100) {
      setFormError("Укажите процент от 0 до 100");
      return;
    }
    if (formType === "establishment_share" && hasEstablishmentShare && !editingId) {
      setFormError("Доля заведения уже задана. Отредактируйте существующее правило.");
      return;
    }
    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/establishment/payout-rules/${editingId}`
        : "/api/establishment/payout-rules";
      const method = editingId ? "PATCH" : "POST";
      const body = editingId
        ? JSON.stringify({ name: formName.trim() || undefined, value: valueNum })
        : JSON.stringify({
            name: formName.trim() || TYPE_LABELS[formType],
            type: formType,
            value: valueNum,
          });
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error ?? "Ошибка");
        setSubmitting(false);
        return;
      }
      setFormName("");
      setFormValue("");
      setFormType("establishment_share");
      setShowForm(false);
      setEditingId(null);
      await fetchRules();
    } catch {
      setFormError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (r: PayoutRule) => {
    setEditingId(r.id);
    setFormName(r.name);
    setFormValue(String(r.value));
    setFormType(r.type as "establishment_share" | "charity");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить правило?")) return;
    const res = await fetch(`/api/establishment/payout-rules/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) await fetchRules();
  };

  if (loading) {
    return <div className="text-white/90">Загрузка…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">{error}</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white text-center">
          Правила распределения
        </h1>
        <p className="text-white/90 text-sm mt-1">
          Доля заведения (процент, остающийся у заведения) и при необходимости — процент в фонд. Остаток пула распределяется между сотрудниками по коэффициентам (настраиваются в разделе «Команда»).
        </p>
      </div>

      {showForm && (
        <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <h2 className="text-lg font-medium text-white">
              {editingId ? "Редактировать правило" : "Новое правило"}
            </h2>
            {formError && (
              <p className="text-sm text-[var(--color-accent-red)]">{formError}</p>
            )}
            {!editingId && (
              <div>
                <CustomDropdown
                  id="payout-rules-type"
                  variant="establishment"
                  label="Тип"
                  value={formType}
                  onChange={(v) => setFormType(v as "establishment_share" | "charity")}
                  options={[
                    { value: "establishment_share", label: "Доля заведения" },
                    { value: "charity", label: "В фонд / благотворительность" },
                  ]}
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-white/90 mb-1">Название</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={TYPE_LABELS[formType]}
                className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
              />
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Процент (0–100)</label>
              <input
                type="text"
                inputMode="decimal"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="15"
                className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Сохранение…" : editingId ? "Сохранить" : "Добавить"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormName("");
                  setFormValue("");
                }}
                className="rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-2 font-medium text-white hover:bg-[var(--color-dark-gray)]/20"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-dark-gray)]/20">
          <span className="font-medium text-white">Правила</span>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-3 py-2 text-sm font-medium text-[#0a192f] hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          )}
        </div>
        {rules.length === 0 ? (
          <div className="p-6 text-center text-white/90">
            Нет правил. Добавьте правило «Доля заведения» (например 10–20%), чтобы заведение получало процент от пула чаевых. Остаток распределяется между сотрудниками по коэффициентам.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-dark-gray)]/10">
            {rules.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="font-medium text-white">{r.name}</p>
                  <p className="text-sm text-white/90">
                    {TYPE_LABELS[r.type] ?? r.type} · {r.value}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(r)}
                    className="rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-2 text-white hover:bg-[var(--color-dark-gray)]/20"
                    title="Редактировать"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="rounded-lg bg-[var(--color-accent-red)]/20 p-2 text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)]/30"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
