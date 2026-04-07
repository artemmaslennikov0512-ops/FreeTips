"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, LogOut, Undo2 } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";

type LeaveRow = {
  id: string;
  status: string;
  statusHint: string;
  rejectionReason: string | null;
  createdAt: string;
  establishmentName: string;
  establishmentCode: string;
};

function FieldError({ children, align = "center" }: { children: React.ReactNode; align?: "center" | "start" }) {
  return (
    <div
      className={`mt-3 rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-3 py-2.5 text-sm text-[var(--color-accent-red)] ${align === "center" ? "text-center" : "text-start"}`}
      role="alert"
    >
      {children}
    </div>
  );
}

export default function LeaveEstablishmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState(false);
  const [establishmentName, setEstablishmentName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requests, setRequests] = useState<LeaveRow[]>([]);

  const loadRequests = useCallback(async (token: string) => {
    const res = await fetch("/api/cabinet/employee-leave-requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { requests: LeaveRow[] };
      setRequests(data.requests ?? []);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("accessToken");
          router.replace("/login");
          return;
        }
        if (!res.ok) return;
        const p = (await res.json()) as { role?: string; establishmentName?: string | null };
        if (p.role !== "EMPLOYEE") {
          router.replace("/cabinet");
          return;
        }
        setRoleOk(true);
        setEstablishmentName(p.establishmentName ?? null);
        await loadRequests(token);
      })
      .finally(() => setLoading(false));
  }, [router, loadRequests]);

  const submitLeaveRequest = async () => {
    if (!window.confirm("Отправить заявку на выход из заведения? Пока администратор не одобрит, вы остаётесь в команде.")) {
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/cabinet/employee-leave-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...getCsrfHeader(),
        },
        body: "{}",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Не удалось отправить заявку");
        return;
      }
      await loadRequests(token);
    } catch {
      setActionError("Не удалось связаться с сервером");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPending = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/cabinet/employee-leave-requests/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...getCsrfHeader(),
        },
        body: "{}",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Не удалось отменить заявку");
        return;
      }
      await loadRequests(token);
    } catch {
      setActionError("Не удалось связаться с сервером");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!roleOk) return null;

  const pending = requests.find((r) => r.status === "PENDING");

  return (
    <div className="cabinet-form-surface mx-auto w-full max-w-xl space-y-8 pb-2">
      <div className="text-center">
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)] sm:text-2xl">
          Покинуть заведение
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Выход из команды заведения выполняется после подтверждения администратора. Карточка сотрудника и QR остаются у
          заведения; отвязывается только ваш личный аккаунт.
        </p>
      </div>

      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] p-4 text-center shadow-[var(--shadow-subtle)] sm:p-6">
        <div className="flex flex-col items-center gap-2">
          <Building2 className="h-8 w-8 text-[var(--color-brand-gold)]" aria-hidden />
          <p className="font-medium text-[var(--color-text)]">{establishmentName ?? "Ваше заведение"}</p>
        </div>

        {pending ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Заявка на выход отправлена. Ожидается решение администратора.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void cancelPending()}
              className={`${CABINET_WAITER_BTN_INLINE} inline-flex min-h-[48px] w-full items-center justify-center gap-2 border border-[var(--color-brand-gold)]/30 bg-transparent px-5 py-3 sm:w-auto sm:min-h-0 sm:py-2.5`}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Undo2 className="h-4 w-4" aria-hidden />}
              Отозвать заявку
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitLeaveRequest()}
            className={`${CABINET_WAITER_BTN_INLINE} mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 px-5 py-3 sm:w-auto sm:min-h-0 sm:py-2.5`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogOut className="h-4 w-4" aria-hidden />}
            Отправить заявку на выход
          </button>
        )}

        {actionError && <FieldError>{actionError}</FieldError>}
      </div>

      <div className="flex w-full flex-col items-center text-center">
        <h2 className="mb-3 w-full text-lg font-semibold text-[var(--color-text)]">История заявок</h2>
        {requests.length === 0 ? (
          <p className="w-full max-w-md text-center text-sm text-[var(--color-text-secondary)]">Пока нет заявок.</p>
        ) : (
          <ul className="w-full space-y-3 text-start">
            {requests.map((r) => (
              <li
                key={r.id}
                className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] p-4 shadow-[var(--shadow-subtle)] sm:p-5"
              >
                <p className="font-medium text-[var(--color-text)]">{r.establishmentName}</p>
                <p className="text-xs font-mono text-[var(--color-text-secondary)]">Код: {r.establishmentCode}</p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{r.statusHint}</p>
                {r.status === "REJECTED" && r.rejectionReason && (
                  <div className="mt-2">
                    <FieldError align="start">{r.rejectionReason}</FieldError>
                  </div>
                )}
                {r.status === "APPROVED" && (
                  <p className="mt-3 rounded-lg border border-emerald-600/25 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100">
                    Выйдите из аккаунта и войдите снова, чтобы обновилась роль в системе.
                  </p>
                )}
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]/80">
                  {new Date(r.createdAt).toLocaleString("ru-RU")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
