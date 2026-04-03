"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ADMIN_BTN, ADMIN_BTN_SM } from "@/lib/admin-button-classes";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";

export type PanelMobileBackVariant = "admin" | "cabinet" | "establishment";

/** Кнопка «Назад» вверху основного блока; видна только на экранах меньше lg. */
export function PanelMobileBackButton({
  variant,
  fallbackHref,
}: {
  variant: PanelMobileBackVariant;
  fallbackHref: string;
}) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  const btnClass =
    variant === "admin"
      ? `${ADMIN_BTN} ${ADMIN_BTN_SM} gap-1.5`
      : variant === "establishment"
        ? "inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-gold)]/40 bg-white/[0.08] px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.12]"
        : `${CABINET_WAITER_BTN_INLINE} px-3 py-2 text-sm`;

  return (
    <div className="shrink-0 border-b border-white/10 lg:hidden">
      <div className="px-4 py-2.5 sm:px-6">
        <button type="button" onClick={goBack} className={btnClass} aria-label="Назад">
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span>Назад</span>
        </button>
      </div>
    </div>
  );
}
