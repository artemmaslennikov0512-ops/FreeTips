"use client";

import { Loader2 } from "lucide-react";

type LoadingSpinnerProps = {
  message?: string;
  className?: string;
};

/** Единый компонент состояния загрузки для кабинета, оплаты, логина */
export function LoadingSpinner({ message = "Загрузка…", className = "" }: LoadingSpinnerProps) {
  return (
    <div
      className={`flex min-h-[40vh] flex-col items-center justify-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-10 w-10 animate-spin text-[#c5a572]" aria-hidden />
      <p className="text-sm text-[#64748b]">{message}</p>
    </div>
  );
}
