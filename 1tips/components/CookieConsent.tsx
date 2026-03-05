"use client";

import Link from "next/link";
import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "cookieConsentAccepted";

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const cookieConsentStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  accept(): void {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore
    }
    this.listeners.forEach((l) => l());
  },
};

export function CookieConsent() {
  const accepted = useSyncExternalStore(
    cookieConsentStore.subscribe.bind(cookieConsentStore),
    getSnapshot,
    () => false,
  );

  const handleAccept = useCallback(() => {
    cookieConsentStore.accept();
  }, []);

  if (accepted) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Уведомление об использовании cookies"
      className="fixed bottom-0 left-0 right-0 z-50 border-0 bg-[var(--color-white)] px-4 py-4 text-[var(--color-text)] shadow-[var(--shadow-medium)] sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Мы используем файлы cookies, чтобы вам было удобно работать с сайтом. Продолжая
          пользоваться сайтом, вы выражаете своё согласие на обработку ваших данных с
          использованием интернет-сервисов «Google Analytics» и «Яндекс Метрика». Порядок
          обработки ваших данных, а также реализуемые требования к их защите содержатся в{" "}
          <Link
            href="/politika"
            className="font-medium text-[var(--color-accent-gold)] underline hover:opacity-90"
          >
            Политике обработки персональных данных
          </Link>
          . В случае несогласия с обработкой ваших данных вы можете отключить сохранение
          cookie в настройках вашего браузера.
        </p>
        <button
          type="button"
          onClick={handleAccept}
          className="shrink-0 self-start rounded-xl bg-[var(--color-accent-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--color-navy)] transition-all hover:opacity-90 sm:self-center"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
