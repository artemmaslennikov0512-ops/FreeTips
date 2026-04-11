"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ADMIN_BTN_NEUTRAL_SM } from "@/lib/admin-button-classes";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";

const TEST_LK_MOCK_BACK_BTN =
  "tlk-transition inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--tlk-accent)]/35 focus-visible:ring-offset-2";

export type PanelMobileBackVariant = "admin" | "adminTlk" | "cabinet" | "establishment" | "testLkMock";

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
      ? `${ADMIN_BTN_NEUTRAL_SM} gap-1.5`
      : variant === "adminTlk"
        ? TEST_LK_MOCK_BACK_BTN
        : variant === "establishment"
        ? "inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-gold)]/40 bg-white/[0.08] px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.12]"
        : variant === "testLkMock"
          ? TEST_LK_MOCK_BACK_BTN
          : `${CABINET_WAITER_BTN_INLINE} px-3 py-2 text-sm`;

  const rowStyle =
    variant === "testLkMock" || variant === "adminTlk"
      ? ({ borderBottomWidth: 1, borderBottomColor: "var(--tlk-panel-border)" } as const)
      : undefined;

  return (
    <div
      className={`shrink-0 lg:hidden ${variant === "testLkMock" || variant === "adminTlk" ? "" : "border-b border-white/10"}`}
      style={rowStyle}
    >
      <div className="px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={goBack}
          className={btnClass}
          style={
            variant === "testLkMock" || variant === "adminTlk"
              ? {
                  borderColor: "var(--tlk-border)",
                  backgroundColor: "var(--tlk-nav-wrap-bg)",
                  color: "var(--tlk-text)",
                }
              : undefined
          }
          aria-label="Назад"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span>Назад</span>
        </button>
      </div>
    </div>
  );
}
