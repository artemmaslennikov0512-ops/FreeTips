"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Send, Loader2, RefreshCw } from "lucide-react";
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

export default function CabinetSupportPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch("/api/support/messages", { headers: authHeaders() });
      if (res.status === 401) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data?.error ?? "Не удалось загрузить сообщения");
        return;
      }
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
      setError(null);
    } catch {
      setError("Ошибка соединения");
    }
  }, [router]);

  const loadInitial = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    await fetchMessages();
    setLoading(false);
  }, [fetchMessages, router]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    const token = getAccessToken();
    if (!token) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ text }),
      });
      if (res.status === 401) {
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
  }, [input, sending, router]);

  if (loading) {
    return <LoadingSpinner message="Загрузка чата…" className="min-h-[40vh]" />;
  }

  return (
    <div className="support-chat-header mx-auto max-w-2xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
        <MessageCircle className="h-7 w-7 text-[var(--color-brand-gold)]" />
        Чат поддержки
      </h1>
      <p className="mt-2 text-sm text-white/90">
        Задайте вопрос или опишите проблему. Ответим в рабочее время. Чтобы увидеть новые ответы — нажмите «Обновить».
      </p>

      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        className="mt-3 flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        Обновить
      </button>

      {error && (
        <div className="mt-4 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
        <div className="flex min-h-[320px] max-h-[50vh] flex-col overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="py-8 text-center text-white/90">
              Пока нет сообщений. Напишите первым — мы ответим.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.isFromStaff ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  m.isFromStaff
                    ? "rounded-bl-md bg-[var(--color-dark-gray)]/30 text-white"
                    : "rounded-br-md bg-[var(--color-brand-gold)]/20 text-white border border-[var(--color-brand-gold)]/30"
                }`}
              >
                {m.isFromStaff && (
                  <div className="mb-1 text-xs font-medium text-white/80">
                    Поддержка
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
              sendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напишите сообщение…"
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
