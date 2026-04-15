"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ADMIN_BTN_NEUTRAL_SM } from "@/lib/admin-button-classes";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";

export type PanelMobileBackVariant = "admin" | "cabinet" | "establishment";

/** inMainBlock — внутри карточки; mobileToolbar — одна строка с темой и меню (max-lg). */
export type PanelMobileBackPlacement = "inMainBlock" | "mobileToolbar";

/** Кнопка «Назад» вверху основного блока; видна только на экранах меньше lg. */
export function PanelMobileBackButton({
  variant,
  fallbackHref,
  placement = "inMainBlock",
}: {
  variant: PanelMobileBackVariant;
  fallbackHref: string;
  placement?: PanelMobileBackPlacement;
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
      ? `${ADMIN_BTN_NEUTRAL_SM} gap-1.5`
      : variant === "establishment"
        ? "inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-gold)]/40 bg-white/[0.08] px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.12]"
        : `${CABINET_WAITER_BTN_INLINE} px-3 py-2 text-sm`;

  const toolbarBtnClass =
    variant === "admin"
      ? btnClass
      : variant === "establishment"
        ? "inline-flex h-11 min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-brand-gold)]/40 bg-white/[0.08] px-2.5 text-sm font-medium text-white hover:bg-white/[0.12] sm:px-3"
        : `${CABINET_WAITER_BTN_INLINE} inline-flex h-11 min-h-[44px] shrink-0 items-center gap-1.5 px-2.5 text-sm sm:px-3`;

  if (placement === "mobileToolbar") {
    return (
      <button type="button" onClick={goBack} className={`${toolbarBtnClass} min-w-0`} aria-label="Назад">
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">Назад</span>
      </button>
    );
  }

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
