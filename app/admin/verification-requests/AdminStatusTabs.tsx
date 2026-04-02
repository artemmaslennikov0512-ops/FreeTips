"use client";

export type AdminRequestTab = "pending" | "approved" | "rejected";

const TABS: { key: AdminRequestTab; label: string }[] = [
  { key: "pending", label: "На рассмотрении" },
  { key: "approved", label: "Принятые" },
  { key: "rejected", label: "Отклонённые" },
];

type Props = {
  value: AdminRequestTab;
  onChange: (tab: AdminRequestTab) => void;
  className?: string;
  /** Счётчики по вкладкам (показываем бейдж, если число > 0). */
  badges?: Partial<Record<AdminRequestTab, number>>;
};

function TabBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-[11px] font-bold leading-none text-white tabular-nums">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AdminStatusTabs({ value, onChange, className = "", badges }: Props) {
  return (
    <div className={`flex flex-wrap justify-center gap-2 ${className}`.trim()}>
      {TABS.map(({ key, label }) => {
        const count = badges?.[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              value === key
                ? "bg-[var(--color-brand-gold)] text-[#0a192f]"
                : "border border-white/20 bg-white/5 text-white/90 hover:bg-white/10"
            }`}
          >
            <span>{label}</span>
            {count != null && count > 0 && <TabBadge n={count} />}
          </button>
        );
      })}
    </div>
  );
}

export function apiStatusForTab(tab: AdminRequestTab): "PENDING" | "APPROVED" | "REJECTED" {
  return tab === "pending" ? "PENDING" : tab === "approved" ? "APPROVED" : "REJECTED";
}
