"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ErrorFallback";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логирование в консоль для мониторинга ошибок рендера (error boundary); на клиенте единый logger не используется.
    console.error(error);
  }, [error]);

  return (
    <ErrorFallback
      title="Что-то пошло не так"
      message="Произошла ошибка. Попробуйте обновить страницу или вернуться на главную."
      onReset={reset}
      className="min-h-[60vh]"
    />
  );
}
