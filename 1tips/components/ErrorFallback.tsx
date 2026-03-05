import Link from "next/link";
import { AlertCircle, Home } from "lucide-react";

const CARD_CLASS =
  "flex flex-col items-center rounded-2xl border-0 bg-white p-8 text-center max-w-md shadow-[0_4px_24px_rgba(10,25,47,0.06)]";
const BTN_PRIMARY =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#c5a572] px-5 py-2.5 text-sm font-medium text-[#0a192f] hover:bg-[#d4b685] focus-visible:outline-none";
const BTN_SECONDARY =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-0 bg-[#f8f9fa] px-5 py-2.5 text-sm font-medium text-[#0a192f] hover:bg-[#eef0f2] focus-visible:outline-none";

type Props = {
  title: string;
  message: string;
  iconSize?: "sm" | "md";
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
};

export function ErrorFallback({ title, message, iconSize = "md", onReset, resetLabel = "Попробовать снова", className }: Props) {
  const iconClass = iconSize === "sm" ? "h-12 w-12" : "h-14 w-14";
  return (
    <div className={`flex min-h-[50vh] flex-col items-center justify-center px-4 ${className ?? ""}`}>
      <div className={`flex flex-col items-center ${CARD_CLASS}`}>
        <AlertCircle className={`${iconClass} text-amber-400 shrink-0`} aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-[#0a192f]">{title}</h1>
        <p className="mt-2 text-sm text-[#2d3748]">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {onReset && (
            <button type="button" onClick={onReset} className={BTN_PRIMARY}>
              {resetLabel}
            </button>
          )}
          <Link href="/" className={BTN_SECONDARY}>
            <Home className="h-4 w-4" />
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
