"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, ChevronRight } from "lucide-react";
import { clearAccessToken, fetchWithAuth } from "@/lib/auth-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type ThreadItem = {
  id: string;
  userId: string;
  userLogin: string;
  userFullName?: string;
  userEmail?: string;
  establishment?: string;
  updatedAt: string;
  lastMessage: {
    id: string;
    body: string;
    fromStaff: boolean;
    createdAt: string;
  } | null;
};

export default function AdminSupportPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth("/api/admin/support/threads");
        if (res.status === 401 || res.status === 403) {
          clearAccessToken();
          router.replace("/login");
          return;
        }
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data?.error ?? "Не удалось загрузить список");
          return;
        }
        const data = (await res.json()) as { threads: ThreadItem[] };
        setThreads(data.threads);
        setError(null);
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return <LoadingSpinner message="Загрузка обращений…" className="min-h-[40vh]" />;
  }

  return (
    <div className="admin-support-page flex w-full flex-col items-center">
      <h1 className="flex w-full items-center justify-center gap-2 text-center text-2xl font-bold text-[var(--color-text)]">
        <MessageCircle className="h-7 w-7 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
        Обращения в поддержку
      </h1>
      <div className="mt-2 max-w-xl text-center text-sm text-[var(--color-text-secondary)]">
        Выберите диалог и ответьте пользователю.
      </div>

      {error && (
        <div className="mt-4 w-full max-w-xl rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">
          {error}
        </div>
      )}

      <div className="mt-6 w-full space-y-2">
        {threads.length === 0 && (
          <div className="py-8 text-center text-[var(--color-text-secondary)]">
            Пока нет обращений.
          </div>
        )}
        {threads.map((t) => (
          <Link
            key={t.id}
            href={`/admin/support/${t.id}`}
            className="admin-support-thread-row flex items-center gap-4 p-4 text-[var(--color-text)] no-underline"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[var(--color-text)]">
                {t.userFullName || t.userLogin}
                {t.establishment && (
                  <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                    · {t.establishment}
                  </span>
                )}
              </div>
              {t.userEmail && (
                <div className="text-sm text-[var(--color-text-secondary)]">{t.userEmail}</div>
              )}
              {t.lastMessage && (
                <div className="mt-1 truncate text-sm text-[var(--color-muted)]">
                  {t.lastMessage.body}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs text-[var(--color-text-secondary)]">
                {new Date(t.updatedAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <ChevronRight className="mt-1 h-5 w-5 text-[var(--color-text-secondary)]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
