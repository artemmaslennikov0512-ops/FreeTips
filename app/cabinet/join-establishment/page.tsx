"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Search, Send } from "lucide-react";
import { fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";
import {
  normalizeEstablishmentCodeInput,
  validateEstablishmentCodeFormat,
  MSG_EST_CODE_NOT_FOUND,
} from "@/lib/establishment-code-input";
import { PANEL_PAGE_TITLE_CABINET } from "@/lib/panel-shell-visual-classes";

type FoundEst = { id: string; name: string; code: string };

type JoinRow = {
  id: string;
  status: string;
  statusHint: string;
  rejectionReason: string | null;
  createdAt: string;
  establishmentName: string;
  establishmentCode: string;
};

function FieldError({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={`mt-3 rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-3 py-2.5 text-sm text-[var(--color-accent-red)] ${align === "center" ? "text-center" : "text-start"}`}
      role="alert"
    >
      {children}
    </div>
  );
}

export default function JoinEstablishmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState(false);
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundEst | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requests, setRequests] = useState<JoinRow[]>([]);

  const loadRequests = useCallback(async () => {
    const res = await fetchWithAuth("/api/cabinet/employee-join-requests");
    if (res.ok) {
      const data = (await res.json()) as { requests: JoinRow[] };
      setRequests(data.requests ?? []);
    }
  }, []);

  useEffect(() => {
    fetchWithAuth("/api/profile")
      .then(async (res) => {
        if (res.status === 401) {
          clearAccessToken();
          router.replace("/login");
          return;
        }
        if (!res.ok) return;
        const p = (await res.json()) as { role?: string };
        if (p.role !== "RECIPIENT") {
          router.replace("/cabinet");
          return;
        }
        setRoleOk(true);
        await loadRequests();
      })
      .finally(() => setLoading(false));
  }, [router, loadRequests]);

  const handleCodeChange = (value: string) => {
    setCode(value);
    setSearchError(null);
    setFound(null);
    setSubmitError(null);
  };

  const handleSearch = async () => {
    const normalized = normalizeEstablishmentCodeInput(code);
    const formatCheck = validateEstablishmentCodeFormat(normalized);
    if (!formatCheck.ok) {
      setSearchError(formatCheck.message);
      setFound(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    setFound(null);
    setSubmitError(null);
    try {
      const res = await fetchWithAuth(
        `/api/cabinet/establishment-lookup?code=${encodeURIComponent(formatCheck.code)}`,
      );
      const data = (await res.json()) as {
        error?: string;
        found: boolean;
        message?: string;
        establishment?: FoundEst;
      };
      if (!res.ok) {
        setSearchError(data.error ?? "Ошибка поиска");
        return;
      }
      if (!data.found) {
        setSearchError(data.message ?? MSG_EST_CODE_NOT_FOUND);
        return;
      }
      if (data.establishment) setFound(data.establishment);
    } catch {
      setSearchError("Не удалось связаться с сервером. Проверьте подключение к интернету.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!found) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetchWithAuth("/api/cabinet/employee-join-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ establishmentId: found.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? "Не удалось отправить заявку");
        return;
      }
      setFound(null);
      setCode("");
      await loadRequests();
    } catch {
      setSubmitError("Не удалось связаться с сервером. Проверьте подключение к интернету.");
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

  const inputInvalid = Boolean(searchError);
  const inputClass =
    "min-h-[48px] min-w-0 flex-1 rounded-lg border bg-[var(--color-dark-gray)]/10 px-4 py-3 font-mono text-base text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 sm:min-h-0 sm:py-2.5 sm:text-sm " +
    (inputInvalid
      ? "border-[var(--color-accent-red)]/50 focus:ring-[var(--color-accent-red)]/25"
      : "border-[var(--color-brand-gold)]/25 focus:border-[var(--color-brand-gold)]/40 focus:ring-[var(--color-brand-gold)]/20");

  return (
    <div className="cabinet-form-surface cabinet-join-establishment mx-auto w-full max-w-xl space-y-8 pb-2">
      <div className="text-center">
        <h1 className={PANEL_PAGE_TITLE_CABINET}>
          Подключиться к заведению
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Введите код заведения. Его можно получить у администратора заведения.
        </p>
      </div>

      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] p-4 shadow-[var(--shadow-subtle)] sm:p-6">
        <label
          htmlFor="establishment-code"
          className="mb-2 block text-center text-sm font-medium text-[var(--color-text)]"
        >
          Код заведения
        </label>
        <p
          id="establishment-code-hint"
          className="mb-3 text-center text-xs leading-relaxed text-[var(--color-text-secondary)]"
        >
          Формат: шесть цифр, например <span className="font-mono">000-002</span> или <span className="font-mono">000002</span>.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            id="establishment-code"
            name="establishmentCode"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={inputInvalid}
            aria-describedby={searchError ? "establishment-search-error" : "establishment-code-hint"}
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="например 000-002"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={searching}
            className={`${CABINET_WAITER_BTN_INLINE} inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 px-5 py-3 sm:min-h-0 sm:py-2.5`}
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
            Найти
          </button>
        </div>
        {searchError && (
          <div id="establishment-search-error">
            <FieldError>{searchError}</FieldError>
          </div>
        )}

        {found && (
          <div className="cabinet-join-establishment-found mt-6 rounded-[10px] border border-[var(--color-brand-gold)]/25 bg-[var(--color-dark-gray)]/10 p-4 text-center sm:p-5">
            <div className="flex flex-col items-center gap-2">
              <Building2 className="h-6 w-6 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
              <div className="min-w-0 max-w-full">
                <p className="font-medium text-[var(--color-text)]">{found.name}</p>
                <p className="mt-1 font-mono text-sm text-[var(--color-text-secondary)]">Код: {found.code}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSubmitRequest()}
              disabled={submitting}
              className={`${CABINET_WAITER_BTN_INLINE} mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 px-5 py-3 sm:w-auto sm:min-h-0 sm:py-2.5`}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              Отправить заявку
            </button>
            {submitError && <FieldError>{submitError}</FieldError>}
          </div>
        )}
      </div>

      <div className="flex w-full flex-col items-center text-center">
        <h2 className="mb-3 w-full text-lg font-semibold text-[var(--color-text)]">Мои заявки</h2>
        {requests.length === 0 ? (
          <p className="w-full max-w-md text-center text-sm text-[var(--color-text-secondary)]">Пока нет заявок.</p>
        ) : (
          <ul className="w-full space-y-3 text-start">
            {requests.map((r) => (
              <li
                key={r.id}
                className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] p-4 text-start shadow-[var(--shadow-subtle)] sm:p-5"
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
                  <p
                    data-join-approved-hint
                    className="mt-3 rounded-lg border border-emerald-600/25 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100"
                  >
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
