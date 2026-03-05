import type { ReactNode } from "react";

const CARD_BASE =
  "relative overflow-hidden rounded-2xl border border-white/10 liquid-glass bg-gradient-to-br from-primary-900/30 via-slate-900/50 to-accent-900/30 transition-modern";

const ORBS = (
  <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden>
    <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary-500/20" />
    <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-accent-500/15" />
  </div>
);

type Props = {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
  static?: boolean;
};

/** Карточка в стиле виртуальной карты (как в ЛК официанта). */
export function CardVirtual({ children, className = "", style, hover = true, static: isStatic = false }: Props) {
  return (
    <div
      className={`${CARD_BASE} ${hover && !isStatic ? "hover-lift hover:shadow-xl" : ""} ${className}`}
      style={style}
    >
      {ORBS}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
