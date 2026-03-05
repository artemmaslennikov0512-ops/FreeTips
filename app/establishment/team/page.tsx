"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Copy, RefreshCw, FileDown, Mail } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

interface EstablishmentInfo {
  id: string;
  name: string;
  uniqueSlug: string;
  maxEmployeesCount: number | null;
  employeesCount: number;
}

interface EmployeeRow {
  id: string;
  name: string;
  position: string;
  coefficient: number;
  isActive: boolean;
  qrCodeIdentifier: string;
  hasUser: boolean;
  createdAt: string;
  avgRating: number | null;
  reviewsCount: number;
}

export default function EstablishmentTeamPage() {
  const [info, setInfo] = useState<EstablishmentInfo | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [linkByEmpId, setLinkByEmpId] = useState<Record<string, string>>({});
  const [loadingTokenId, setLoadingTokenId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [infoRes, empRes] = await Promise.all([
        fetch("/api/establishment/info", { headers: authHeaders() }),
        fetch("/api/establishment/employees", { headers: authHeaders() }),
      ]);
      if (!infoRes.ok || !empRes.ok) {
        setError("Ошибка загрузки");
        setLoading(false);
        return;
      }
      const infoData = await infoRes.json();
      const empData = await empRes.json();
      setInfo(infoData);
      setEmployees(empData.employees ?? []);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/establishment/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: formName.trim(),
          position: formPosition.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error ?? "Ошибка");
        setSubmitting(false);
        return;
      }
      setFormName("");
      setFormPosition("");
      setShowForm(false);
      fetchData();
    } catch {
      setFormError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  };

  const getOrRegenerateToken = async (empId: string) => {
    setLoadingTokenId(empId);
    try {
      const res = await fetch(
        `/api/establishment/employees/${empId}/registration-token`,
        { method: "POST", headers: authHeaders() },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Ошибка");
        return;
      }
      setLinkByEmpId((prev) => ({ ...prev, [empId]: data.registrationLink }));
    } catch {
      alert("Ошибка соединения");
    } finally {
      setLoadingTokenId(null);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => alert("Ссылка скопирована"));
  };

  const downloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch("/api/establishment/employees/pdf", {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "Ошибка загрузки PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qr-cards.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Ошибка загрузки");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const inviteByEmail = async (empId: string) => {
    const email = window.prompt("Введите email для отправки приглашения:");
    if (!email?.trim()) return;
    setInvitingId(empId);
    try {
      const res = await fetch(`/api/establishment/employees/${empId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Ошибка отправки");
        return;
      }
      alert("Письмо с ссылкой отправлено.");
    } catch {
      alert("Ошибка соединения");
    } finally {
      setInvitingId(null);
    }
  };

  const toggleActive = async (emp: EmployeeRow) => {
    setTogglingId(emp.id);
    try {
      const res = await fetch(`/api/establishment/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ isActive: !emp.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Ошибка");
        return;
      }
      fetchData();
    } catch {
      alert("Ошибка соединения");
    } finally {
      setTogglingId(null);
    }
  };

  const canAdd =
    info &&
    (info.maxEmployeesCount == null || info.employeesCount < info.maxEmployeesCount);

  if (loading) {
    return <div className="text-[var(--color-text-secondary)]">Загрузка…</div>;
  }

  if (error || !info) {
    return (
      <div className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
        {error ?? "Заведение не найдено"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">
          Команда
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloadingPdf || employees.filter((e) => e.isActive).length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-medium text-white hover:bg-white/20 disabled:opacity-50"
          >
            <FileDown className={`h-5 w-5 ${downloadingPdf ? "animate-pulse" : ""}`} />
            {downloadingPdf ? "Скачивание…" : "Скачать PDF с QR"}
          </button>
          {canAdd && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 font-medium text-[#0a192f] hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              Добавить сотрудника
            </button>
          )}
        </div>
      </div>

      <p className="text-[var(--color-text-secondary)] text-sm">
        Сотрудников: {info.employeesCount}
        {info.maxEmployeesCount != null && ` из ${info.maxEmployeesCount}`}.
        {!canAdd && info.maxEmployeesCount != null && (
          <span className="block mt-1 text-amber-200">
            Лимит достигнут. Увеличить может суперадмин в разделе «Заведения».
          </span>
        )}
      </p>

      {showForm && (
        <form
          onSubmit={handleAddEmployee}
          className="rounded-2xl border border-white/10 bg-[var(--color-navy)] p-6 space-y-4"
        >
          <h2 className="text-lg font-medium text-white">Новый сотрудник</h2>
          {formError && <p className="text-sm text-red-300">{formError}</p>}
          <div>
            <label className="block text-sm text-white/80 mb-1">Имя *</label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-1">Должность</label>
            <input
              type="text"
              value={formPosition}
              onChange={(e) => setFormPosition(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[var(--color-brand-gold)] px-4 py-2 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Добавление…" : "Добавить"}
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

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[var(--color-navy)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 font-medium text-white">Имя</th>
              <th className="p-3 font-medium text-white">Должность</th>
              <th className="p-3 font-medium text-white">Коэфф.</th>
              <th className="p-3 font-medium text-white">Рейтинг</th>
              <th className="p-3 font-medium text-white">Статус</th>
              <th className="p-3 font-medium text-white">Привязан к аккаунту</th>
              <th className="p-3 font-medium text-white">Ссылка для регистрации</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-white/60">
                  Нет сотрудников. Добавьте первого и выдайте ему ссылку для регистрации (1 токен = 1 официант).
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.id}
                  className={`border-b border-white/5 ${!emp.isActive ? "opacity-70" : ""}`}
                >
                  <td className="p-3 text-white">{emp.name}</td>
                  <td className="p-3 text-white/80">{emp.position || "—"}</td>
                  <td className="p-3 text-white/80">{emp.coefficient}</td>
                  <td className="p-3 text-white/80">
                    {emp.reviewsCount > 0
                      ? `${emp.avgRating ?? "—"} (${emp.reviewsCount})`
                      : "—"}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs ${emp.isActive ? "text-green-200" : "text-white/50"}`}>
                      {emp.isActive ? "Активен" : "Неактивен"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleActive(emp)}
                      disabled={togglingId === emp.id}
                      className="ml-2 rounded-lg bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
                    >
                      {togglingId === emp.id ? "…" : emp.isActive ? "Деактивировать" : "Активировать"}
                    </button>
                  </td>
                  <td className="p-3 text-white/80">
                    {emp.hasUser ? "Да" : "Нет"}
                  </td>
                  <td className="p-3">
                    {emp.hasUser ? (
                      <span className="text-white/50 text-sm">Уже зарегистрирован</span>
                    ) : linkByEmpId[emp.id] ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyLink(linkByEmpId[emp.id])}
                          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white hover:bg-white/20"
                        >
                          <Copy className="h-3 w-3" /> Копировать
                        </button>
                        <button
                          type="button"
                          onClick={() => getOrRegenerateToken(emp.id)}
                          disabled={loadingTokenId === emp.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1.5 text-xs text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${loadingTokenId === emp.id ? "animate-spin" : ""}`}
                          />{" "}
                          Сменить токен
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => getOrRegenerateToken(emp.id)}
                          disabled={loadingTokenId === emp.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-brand-gold)]/80 px-2 py-1.5 text-xs text-[#0a192f] hover:bg-[var(--color-brand-gold)] disabled:opacity-50"
                        >
                          {loadingTokenId === emp.id ? "…" : "Выдать ссылку"}
                        </button>
                        <button
                          type="button"
                          onClick={() => inviteByEmail(emp.id)}
                          disabled={invitingId === emp.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white hover:bg-white/20 disabled:opacity-50"
                          title="Пригласить по email"
                        >
                          <Mail className="h-3 w-3" />
                          {invitingId === emp.id ? "…" : "Email"}
                        </button>
                      </div>
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
