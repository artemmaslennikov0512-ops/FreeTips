"use client";

import { ADMIN_BTN, ADMIN_BTN_TAB } from "@/lib/admin-button-classes";

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
  /** Выравнивание ряда вкладок (по умолчанию по центру). */
  align?: "center" | "start";
  /** Счётчик только для «На рассмотрении» — бейдж исчезает, когда очередь пуста (принятые/отклонённые без бейджа). */
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

export function AdminStatusTabs({ value, onChange, className = "", align = "center", badges }: Props) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${align === "start" ? "justify-start" : "justify-center"} ${className}`.trim()}
    >
      {TABS.map(({ key, label }) => {
        const count = badges?.[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`${ADMIN_BTN} ${ADMIN_BTN_TAB} px-4 py-2 text-sm font-medium ${value === key ? "admin-btn--primary" : ""}`}
          >
            <span>{label}</span>
            {key === "pending" && count != null && count > 0 && <TabBadge n={count} />}
          </button>
        );
      })}
    </div>
  );
}

export function apiStatusForTab(tab: AdminRequestTab): "PENDING" | "APPROVED" | "REJECTED" {
  return tab === "pending" ? "PENDING" : tab === "approved" ? "APPROVED" : "REJECTED";
}
