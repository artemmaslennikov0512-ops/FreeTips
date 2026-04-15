"use client";

import { useEffect, useState, useRef } from "react";
import { useMobileDarkChromeOverlay } from "@/lib/use-mobile-dark-chrome-overlay";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Copy, RefreshCw, FileDown, Mail, Pencil, Upload, ImageIcon, X, Check } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth-client";
import { beginCabinetImpersonation } from "@/lib/cabinet-impersonation";
import { PANEL_PAGE_TITLE_ESTABLISHMENT_WHITE_LG } from "@/lib/panel-shell-visual-classes";

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
  photoUrl: string | null;
  printCardPhotoUrl: string | null;
  createdAt: string;
  avgRating: number | null;
  reviewsCount: number;
}

export default function EstablishmentTeamPage() {
  const router = useRouter();
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
  const [editEmployee, setEditEmployee] = useState<EmployeeRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editCoefficient, setEditCoefficient] = useState(1);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [viewCabinetEmpId, setViewCabinetEmpId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const printInputRef = useRef<HTMLInputElement>(null);

  useMobileDarkChromeOverlay(editEmployee !== null);

  const fetchData = async (): Promise<EmployeeRow[]> => {
    setLoading(true);
    setError(null);
    try {
      const [infoRes, empRes] = await Promise.all([
        fetchWithAuth("/api/establishment/info"),
        fetchWithAuth("/api/establishment/employees"),
      ]);
      if (!infoRes.ok || !empRes.ok) {
        setError("Ошибка загрузки");
        setLoading(false);
        return [];
      }
      const infoData = await infoRes.json();
      const empData = await empRes.json();
      const list = empData.employees ?? [];
      setInfo(infoData);
      setEmployees(list);
      return list;
    } catch {
      setError("Ошибка соединения");
      return [];
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
      const res = await fetchWithAuth("/api/establishment/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetchWithAuth(`/api/establishment/employees/${empId}/registration-token`, {
        method: "POST",
      });
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
      const res = await fetchWithAuth("/api/establishment/employees/pdf");
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
      const res = await fetchWithAuth(`/api/establishment/employees/${empId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetchWithAuth(`/api/establishment/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

  const disconnectUser = async (emp: EmployeeRow) => {
    if (
      !window.confirm(
        "Отвязать личный аккаунт от этой карточки? Официант снова станет самостоятельным получателем; QR заведения останется. Потребуется повторный вход в аккаунт.",
      )
    ) {
      return;
    }
    setDisconnectingId(emp.id);
    try {
      const res = await fetchWithAuth(`/api/establishment/employees/${emp.id}/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Ошибка");
        return;
      }
      if (data?.message) {
        alert(data.message);
      }
      fetchData();
    } catch {
      alert("Ошибка соединения");
    } finally {
      setDisconnectingId(null);
    }
  };

  const openEdit = (emp: EmployeeRow) => {
    setEditEmployee(emp);
    setEditName(emp.name);
    setEditPosition(emp.position || "");
    setEditCoefficient(emp.coefficient);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployee) return;
    setEditError(null);
    setSavingEdit(true);
    try {
      const res = await fetchWithAuth(`/api/establishment/employees/${editEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          position: editPosition.trim() || null,
          coefficient: Number(editCoefficient),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.error ?? "Ошибка сохранения");
        setSavingEdit(false);
        return;
      }
      setEditEmployee(null);
      fetchData();
    } catch {
      setEditError("Ошибка соединения");
    } finally {
      setSavingEdit(false);
    }
  };

  const openEmployeeCabinet = async (empId: string) => {
    setViewCabinetEmpId(empId);
    try {
      const res = await fetchWithAuth(`/api/establishment/employees/${empId}/cabinet-token`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as { accessToken?: string; error?: string };
      if (!res.ok || !body.accessToken) {
        alert(body.error ?? "Не удалось открыть кабинет");
        return;
      }
      beginCabinetImpersonation(body.accessToken, "/establishment/team");
      router.push("/cabinet");
    } catch {
      alert("Ошибка соединения");
    } finally {
      setViewCabinetEmpId(null);
    }
  };

  const uploadPhoto = async (empId: string, type: "avatar" | "print", file: File) => {
    setUploadingPhotoId(empId);
    try {
      const form = new FormData();
      form.set("type", type);
      form.set("file", file);
      const res = await fetchWithAuth(`/api/establishment/employees/${empId}/photo`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Ошибка загрузки фото");
        return;
      }
      const list = await fetchData();
      if (editEmployee && editEmployee.id === empId) {
        const updated = list.find((e) => e.id === empId);
        if (updated) setEditEmployee(updated);
      }
      if (type === "avatar" && avatarInputRef.current) avatarInputRef.current.value = "";
      if (type === "print" && printInputRef.current) printInputRef.current.value = "";
    } catch {
      alert("Ошибка соединения");
    } finally {
      setUploadingPhotoId(null);
    }
  };

  if (loading) {
    return <div className="text-white/90">Загрузка…</div>;
  }

  if (error || !info) {
    return (
      <div className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
        {error ?? "Заведение не найдено"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className={PANEL_PAGE_TITLE_ESTABLISHMENT_WHITE_LG}>
          Команда
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloadingPdf || employees.filter((e) => e.isActive).length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-dark-gray)]/20 disabled:opacity-50"
          >
            <FileDown className={`h-4 w-4 ${downloadingPdf ? "animate-pulse" : ""}`} />
            {downloadingPdf ? "Скачивание…" : "Скачать PDF с QR"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-gold)] px-3 py-2 text-xs font-medium text-[#0a192f] hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Добавить сотрудника
          </button>
        </div>
      </div>

      <p className="text-white/90 text-xs">Сотрудников: {info.employeesCount}.</p>

      {showForm && (
        <div className="cabinet-card rounded-[10px] border-0 bg-[var(--establishment-charcoal)] shadow-[var(--shadow-subtle)] overflow-hidden">
          <form onSubmit={handleAddEmployee} className="p-4 space-y-3">
            <h2 className="text-base font-medium text-white">Новый сотрудник</h2>
            {formError && <p className="text-xs text-[var(--color-accent-red)]">{formError}</p>}
            <div>
              <label className="mb-1 block text-xs text-white/90">ФИО *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2.5 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/90">Должность</label>
              <input
                type="text"
                value={formPosition}
                onChange={(e) => setFormPosition(e.target.value)}
                className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2.5 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Добавление…" : "Добавить"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-2 font-medium text-white hover:bg-[var(--color-dark-gray)]/20"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {editEmployee && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="establishment-edit-modal w-full max-w-md rounded-[10px] border border-[var(--color-brand-gold)]/30 shadow-[var(--shadow-card)] overflow-hidden">
            <form onSubmit={handleSaveEdit} className="p-4 space-y-3">
              <h2 className="text-base font-medium text-white">Редактировать сотрудника</h2>
              {editError && <p className="text-xs text-[var(--color-accent-red)]">{editError}</p>}
              <div>
                <label className="mb-1 block text-xs text-white/90">ФИО *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2.5 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/90">Должность</label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2.5 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/90">Коэффициент</label>
                <input
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  value={editCoefficient}
                  onChange={(e) => setEditCoefficient(parseFloat(e.target.value) || 1)}
                  className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2.5 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
                />
              </div>
              <div className="border-t border-white/10 pt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/90">Фото для страницы оплаты и ЛК</label>
                  <p className="text-xs text-white/70 mb-2">Показывается на странице оплаты и в сайдбаре официанта. Рекомендуемое разрешение: не менее 200×200 px. Форматы: JPEG, PNG, WebP.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {editEmployee.photoUrl && (
                      <Image
                        src={editEmployee.photoUrl}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 rounded-full object-cover border border-[var(--color-brand-gold)]/20"
                      />
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2.5 py-1.5 text-xs text-white hover:bg-[var(--color-dark-gray)]/20">
                      <Upload className="h-4 w-4" />
                      {uploadingPhotoId === editEmployee.id ? "Загрузка…" : "Выбрать файл"}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadPhoto(editEmployee.id, "avatar", f);
                        }}
                        disabled={uploadingPhotoId === editEmployee.id}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/90">Фото для печатной карточки QR</label>
                  <p className="text-xs text-white/70 mb-2">Только для карточки при печати PDF. Рекомендуемое разрешение: не менее 150×150 px. Форматы: JPEG, PNG (WebP в PDF не выводится).</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {editEmployee.printCardPhotoUrl && (
                      <Image
                        src={editEmployee.printCardPhotoUrl}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 rounded-full object-cover border border-[var(--color-brand-gold)]/20"
                      />
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2.5 py-1.5 text-xs text-white hover:bg-[var(--color-dark-gray)]/20">
                      <ImageIcon className="h-4 w-4" />
                      {uploadingPhotoId === editEmployee.id ? "Загрузка…" : "Выбрать файл"}
                      <input
                        ref={printInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadPhoto(editEmployee.id, "print", f);
                        }}
                        disabled={uploadingPhotoId === editEmployee.id}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
                >
                  {savingEdit ? "Сохранение…" : "Сохранить"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditEmployee(null); setEditError(null); }}
                  className="rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-2 font-medium text-white hover:bg-[var(--color-dark-gray)]/20"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Мобильная версия: карточки */}
      <div className="space-y-4 lg:hidden">
        {employees.length === 0 ? (
          <div className="cabinet-card rounded-lg border-0 bg-[var(--establishment-charcoal)] p-4 text-center text-xs text-white/90 shadow-[var(--shadow-subtle)]">Нет сотрудников.</div>
        ) : (
          employees.map((emp) => (
            <div key={emp.id} className={`cabinet-card rounded-lg border-0 bg-[var(--establishment-charcoal)] p-3 shadow-[var(--shadow-subtle)] ${!emp.isActive ? "opacity-70" : ""}`}>
              <p className="text-xs text-white/70">
                Код официанта:{" "}
                {emp.hasUser ? (
                  <button
                    type="button"
                    onClick={() => void openEmployeeCabinet(emp.id)}
                    disabled={viewCabinetEmpId === emp.id}
                    className="font-mono text-[var(--color-brand-gold)] hover:underline disabled:cursor-wait disabled:opacity-50"
                    title="Открыть личный кабинет официанта"
                  >
                    {emp.qrCodeIdentifier}
                  </button>
                ) : (
                  <span className="font-mono text-white/90">{emp.qrCodeIdentifier}</span>
                )}
              </p>
              <p className="mt-1 font-medium text-white">ФИО: {emp.name}</p>
              <p className="text-xs text-white/90">Должность: {emp.position || "—"}</p>
              <p className="mt-1 text-[11px] text-white/80">Коэфф. {emp.coefficient} · Рейтинг: {emp.reviewsCount > 0 ? `${emp.avgRating ?? "—"} (${emp.reviewsCount})` : "—"}</p>
              <p className="mt-1 text-xs text-white/70">{emp.isActive ? "Активен" : "Неактивен"} · {emp.hasUser ? "Привязан к аккаунту" : "Не привязан"}</p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-dark-gray)]/20 pt-3">
                <button type="button" onClick={() => openEdit(emp)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-xs text-white hover:bg-[var(--color-dark-gray)]/20">
                  <Pencil className="h-3 w-3" /> Редактировать
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(emp)}
                  disabled={togglingId === emp.id}
                  title={
                    emp.isActive
                      ? "Деактивировать карточку — сотрудник не будет в списке активных, гостевые ссылки сохраняются."
                      : "Активировать карточку — снова показывать сотрудника как активного."
                  }
                  aria-label={emp.isActive ? "Деактивировать" : "Активировать"}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white/85 transition-colors hover:border-red-400/45 hover:bg-red-500/15 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
                >
                  {togglingId === emp.id ? (
                    <span className="text-xs leading-none">…</span>
                  ) : emp.isActive ? (
                    <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  )}
                </button>
                {emp.hasUser && (
                  <div className="flex w-full flex-col items-center gap-2">
                    <span className="text-center text-xs text-white/80">Уже зарегистрирован</span>
                    <button
                      type="button"
                      onClick={() => void disconnectUser(emp)}
                      disabled={disconnectingId === emp.id}
                      title="Отвязать личный аккаунт от карточки: официант станет самостоятельным получателем, потребуется повторный вход. QR заведения останется."
                      aria-label="Отвязать аккаунт"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/[0.08] text-amber-100/95 transition-colors hover:border-amber-400/55 hover:bg-amber-500/20 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45 disabled:opacity-50"
                    >
                      {disconnectingId === emp.id ? (
                        <span className="text-xs leading-none">…</span>
                      ) : (
                        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                      )}
                    </button>
                  </div>
                )}
                {!emp.hasUser && linkByEmpId[emp.id] && (
                  <>
                    <button type="button" onClick={() => copyLink(linkByEmpId[emp.id])} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-xs text-white hover:bg-[var(--color-dark-gray)]/20">
                      <Copy className="h-3 w-3" /> Копировать
                    </button>
                    <button type="button" onClick={() => getOrRegenerateToken(emp.id)} disabled={loadingTokenId === emp.id} className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-brand-gold)]/20 px-3 py-2 text-xs text-white hover:bg-[var(--color-brand-gold)]/30 disabled:opacity-50">
                      <RefreshCw className={`h-3 w-3 ${loadingTokenId === emp.id ? "animate-spin" : ""}`} /> Сменить токен
                    </button>
                  </>
                )}
                {!emp.hasUser && !linkByEmpId[emp.id] && (
                  <>
                    <button type="button" onClick={() => getOrRegenerateToken(emp.id)} disabled={loadingTokenId === emp.id} className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-brand-gold)] px-3 py-2 text-xs text-[#0a192f] hover:opacity-90 disabled:opacity-50">
                      {loadingTokenId === emp.id ? "…" : "Выдать ссылку"}
                    </button>
                    <button type="button" onClick={() => inviteByEmail(emp.id)} disabled={invitingId === emp.id} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-xs text-white hover:bg-[var(--color-dark-gray)]/20 disabled:opacity-50" title="Пригласить по email">
                      <Mail className="h-3 w-3" />{invitingId === emp.id ? "…" : "Email"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Десктоп: таблица — белые границы в светлой теме, выравнивание по колонкам, overflow для узких экранов */}
      <div className="establishment-team-table cabinet-card max-lg:hidden overflow-hidden rounded-[10px] border-0 bg-[var(--establishment-charcoal)] shadow-[var(--shadow-subtle)]">
        <div className="overflow-x-auto">
          <table className="establishment-team-table-grid w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="establishment-team-table-row-head">
                <th className="establishment-team-table-cell whitespace-nowrap p-2 font-medium text-white text-center">Код официанта</th>
                <th className="establishment-team-table-cell establishment-team-table-cell-name whitespace-nowrap p-2 font-medium text-white text-center">ФИО</th>
                <th className="establishment-team-table-cell establishment-team-table-cell-position whitespace-nowrap p-2 font-medium text-white text-center">Должность</th>
                <th className="establishment-team-table-cell establishment-team-table-cell-coef whitespace-nowrap p-2 font-medium text-white text-center">Коэфф.</th>
                <th className="establishment-team-table-cell establishment-team-table-cell-rating whitespace-nowrap p-2 font-medium text-white text-center">Рейтинг</th>
                <th className="establishment-team-table-cell establishment-team-table-cell-status whitespace-nowrap p-2 font-medium text-white text-center">Статус</th>
                <th className="establishment-team-table-cell establishment-team-table-cell-linked whitespace-nowrap p-2 font-medium text-white text-center">Привязан к аккаунту</th>
                <th className="establishment-team-table-cell establishment-team-table-cell-link whitespace-nowrap p-2 font-medium text-white text-center">Ссылка для регистрации</th>
                <th className="establishment-team-table-cell establishment-team-table-cell-actions whitespace-nowrap p-2 font-medium text-white text-center">Действия</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr className="establishment-team-table-row">
                  <td colSpan={9} className="p-3 text-center text-sm text-white/90">Нет сотрудников.</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className={`establishment-team-table-row ${!emp.isActive ? "opacity-70" : ""}`}>
                    <td className="establishment-team-table-cell whitespace-nowrap p-2 text-center font-mono text-white/90">
                      {emp.hasUser ? (
                        <button
                          type="button"
                          onClick={() => void openEmployeeCabinet(emp.id)}
                          disabled={viewCabinetEmpId === emp.id}
                          className="font-mono text-[var(--color-brand-gold)] hover:underline disabled:cursor-wait disabled:opacity-50"
                          title="Открыть личный кабинет официанта"
                        >
                          {emp.qrCodeIdentifier}
                        </button>
                      ) : (
                        emp.qrCodeIdentifier
                      )}
                    </td>
                    <td className="establishment-team-table-cell establishment-team-table-cell-name whitespace-nowrap p-2 text-center text-white">{emp.name}</td>
                    <td className="establishment-team-table-cell establishment-team-table-cell-position whitespace-nowrap p-2 text-center text-white/90">{emp.position || "—"}</td>
                    <td className="establishment-team-table-cell establishment-team-table-cell-coef whitespace-nowrap p-2 text-center text-white/90">{emp.coefficient}</td>
                    <td className="establishment-team-table-cell establishment-team-table-cell-rating whitespace-nowrap p-2 text-center text-white/90">{emp.reviewsCount > 0 ? `${emp.avgRating ?? "—"} (${emp.reviewsCount})` : "—"}</td>
                    <td className="establishment-team-table-cell establishment-team-table-cell-status p-2 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <span className={`text-sm ${emp.isActive ? "text-[var(--color-accent-emerald)]" : "text-white/80"}`}>{emp.isActive ? "Активен" : "Неактивен"}</span>
                        <button
                          type="button"
                          onClick={() => toggleActive(emp)}
                          disabled={togglingId === emp.id}
                          title={
                            emp.isActive
                              ? "Деактивировать карточку — сотрудник не будет в списке активных, гостевые ссылки сохраняются."
                              : "Активировать карточку — снова показывать сотрудника как активного."
                          }
                          aria-label={emp.isActive ? "Деактивировать" : "Активировать"}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] text-white/85 transition-colors hover:border-red-400/45 hover:bg-red-500/15 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
                        >
                          {togglingId === emp.id ? (
                            <span className="text-[11px] leading-none">…</span>
                          ) : emp.isActive ? (
                            <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                          ) : (
                            <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="establishment-team-table-cell establishment-team-table-cell-linked whitespace-nowrap p-2 text-center text-white/90">{emp.hasUser ? "Да" : "Нет"}</td>
                    <td className="establishment-team-table-cell establishment-team-table-cell-link p-2 text-center">
                      {emp.hasUser ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-sm text-white/90">Уже зарегистрирован</span>
                          <button
                            type="button"
                            onClick={() => void disconnectUser(emp)}
                            disabled={disconnectingId === emp.id}
                            title="Отвязать личный аккаунт от карточки: официант станет самостоятельным получателем, потребуется повторный вход. QR заведения останется."
                            aria-label="Отвязать аккаунт"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/[0.08] text-amber-100/95 transition-colors hover:border-amber-400/55 hover:bg-amber-500/20 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45 disabled:opacity-50"
                          >
                            {disconnectingId === emp.id ? (
                              <span className="text-[11px] leading-none">…</span>
                            ) : (
                              <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                            )}
                          </button>
                        </div>
                      ) : linkByEmpId[emp.id] ? (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button type="button" onClick={() => copyLink(linkByEmpId[emp.id])} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2 py-1.5 text-xs text-white hover:bg-[var(--color-dark-gray)]/20">
                            <Copy className="h-3 w-3" /> Копировать
                          </button>
                          <button type="button" onClick={() => getOrRegenerateToken(emp.id)} disabled={loadingTokenId === emp.id} className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-brand-gold)]/20 px-2 py-1.5 text-xs text-white hover:bg-[var(--color-brand-gold)]/30 disabled:opacity-50">
                            <RefreshCw className={`h-3 w-3 ${loadingTokenId === emp.id ? "animate-spin" : ""}`} /> Сменить токен
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <button type="button" onClick={() => getOrRegenerateToken(emp.id)} disabled={loadingTokenId === emp.id} className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-brand-gold)] px-2 py-1.5 text-xs text-[#0a192f] hover:opacity-90 disabled:opacity-50">
                            {loadingTokenId === emp.id ? "…" : "Выдать ссылку"}
                          </button>
                          <button type="button" onClick={() => inviteByEmail(emp.id)} disabled={invitingId === emp.id} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2 py-1.5 text-xs text-white hover:bg-[var(--color-dark-gray)]/20 disabled:opacity-50" title="Пригласить по email">
                            <Mail className="h-3 w-3" />{invitingId === emp.id ? "…" : "Email"}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="establishment-team-table-cell establishment-team-table-cell-actions p-2 text-center">
                      <div className="flex justify-center">
                        <button type="button" onClick={() => openEdit(emp)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2 py-1.5 text-xs text-white hover:bg-[var(--color-dark-gray)]/20">
                          <Pencil className="h-3 w-3" /> Редактировать
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
