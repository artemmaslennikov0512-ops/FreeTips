"use client";

import { ErrorBoundaryContent } from "@/components/ErrorBoundaryContent";

export default function Error({
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
      title="Что-то пошло не так"
      message="Произошла ошибка. Попробуйте обновить страницу или вернуться на главную."
      className="min-h-[60vh]"
    />
  );
}
