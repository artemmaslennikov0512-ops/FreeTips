"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ErrorFallback";

export default function CabinetError({
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
      title="Ошибка в кабинете"
      message="Не удалось загрузить страницу. Попробуйте снова или вернитесь на главную."
      iconSize="sm"
      onReset={reset}
    />
  );
}
