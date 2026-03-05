"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, RefreshCw } from "lucide-react";
import { getAccessToken, authHeaders, clearAccessToken } from "@/lib/auth-client";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type Message = {
  id: string;
  body: string;
  authorId: string;
  isFromStaff: boolean;
  authorLogin?: string;
  authorName?: string;
  createdAt: string;
};

type User = {
  id: string;
  login: string;
  fullName?: string;
  email?: string;
  establishment?: string;
};

export default function AdminSupportThreadPage() {
  const router = useRouter();
  const params = useParams();
  const threadId = params?.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !threadId) return;
    try {
      const res = await fetch(`/api/admin/support/threads/${threadId}/messages`, {
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      if (res.status === 404) {
        setError("Тред не найден");
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data?.error ?? "Ошибка загрузки");
        return;
      }
      const data = (await res.json()) as {
        threadId: string;
        user: User;
        messages: Message[];
      };
      setUser(data.user);
      setMessages(data.messages);
      setError(null);
    } catch {
      setError("Ошибка соединения");
    }
  }, [threadId, router]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchThread();
    setRefreshing(false);
  }, [fetchThread]);

  useEffect(() => {
    if (!threadId) return;
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    fetchThread().finally(() => setLoading(false));
  }, [threadId, fetchThread, router]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !threadId) return;
    const token = getAccessToken();
    if (!token) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/admin/support/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ text }),
      });
      if (res.status === 401 || res.status === 403) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data?.error ?? "Не удалось отправить");
        setInput(text);
        return;
      }
      const msg = (await res.json()) as Message;
      setMessages((prev) => [...prev, msg]);
      setError(null);
    } catch {
      setError("Ошибка соединения");
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, threadId, router]);

  if (loading) {
    return <LoadingSpinner message="Загрузка диалога…" className="min-h-[40vh]" />;
  }

  if (error && !user) {
    return (
      <div className="space-y-4 admin-support-thread">
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> К списку обращений
        </Link>
        <p className="text-amber-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-support-thread mx-auto max-w-2xl">
      <Link
        href="/admin/support"
        className="mb-4 inline-flex items-center gap-2 text-sm text-white/90 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> К списку обращений
      </Link>

      {user && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="font-medium text-white">
            {user.fullName || user.login}
          </div>
          {user.establishment && (
            <div className="text-sm text-white/80">{user.establishment}</div>
          )}
          {user.email && (
            <div className="text-sm text-white/80">{user.email}</div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        className="mb-4 flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        Обновить
      </button>

      <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
        <div className="support-chat-messages flex min-h-[320px] max-h-[50vh] flex-col overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="py-8 text-center text-white/90">
              Нет сообщений в этом диалоге.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.isFromStaff ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  m.isFromStaff
                    ? "rounded-br-md bg-[var(--color-brand-gold)]/25 text-white border border-[var(--color-brand-gold)]/40"
                    : "rounded-bl-md bg-white/15 text-white border border-white/20"
                }`}
              >
                {!m.isFromStaff && (
                  <div className="mb-1 text-xs font-medium text-white/80">
                    {m.authorName || m.authorLogin || "Клиент"}
                  </div>
                )}
                {m.isFromStaff && (
                  <div className="mb-1 text-xs font-medium text-white/80">
                    Вы
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words text-sm text-white">{m.body}</div>
                <div className="mt-1 text-xs text-white/70">
                  {new Date(m.createdAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={listEndRef} />
        </div>

        <div className="border-t border-white/10 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendReply();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ответ клиенту…"
              maxLength={4000}
              className="support-chat-input flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/60 focus:border-[var(--color-brand-gold)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/30"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-gold)] text-[#0a192f] hover:opacity-90 disabled:opacity-50"
              aria-label="Отправить"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
