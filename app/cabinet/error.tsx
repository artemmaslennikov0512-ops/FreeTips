"use client";

import { ErrorBoundaryContent } from "@/components/ErrorBoundaryContent";

export default function CabinetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundaryContent
      error={error}
      reset={reset}
      title="Ошибка в кабинете"
      message="Не удалось загрузить страницу. Попробуйте снова или вернитесь на главную."
      iconSize="sm"
    />
  );
}
