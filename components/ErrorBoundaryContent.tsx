"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ErrorFallback";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  message: string;
  iconSize?: "sm" | "md";
  className?: string;
};

/** Shared error boundary content: logs error and renders ErrorFallback. */
export function ErrorBoundaryContent({ error, reset, title, message, iconSize, className }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorFallback
      title={title}
      message={message}
      iconSize={iconSize}
      onReset={reset}
      className={className}
    />
  );
}
