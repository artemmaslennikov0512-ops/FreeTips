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
};

export function AdminStatusTabs({ value, onChange, className = "" }: Props) {
  return (
    <div className={`flex flex-wrap justify-center gap-2 ${className}`.trim()}>
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            value === key
              ? "bg-[var(--color-brand-gold)] text-[#0a192f]"
              : "border border-white/20 bg-white/5 text-white/90 hover:bg-white/10"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function apiStatusForTab(tab: AdminRequestTab): "PENDING" | "APPROVED" | "REJECTED" {
  return tab === "pending" ? "PENDING" : tab === "approved" ? "APPROVED" : "REJECTED";
}
