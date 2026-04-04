"use client";

import { ADMIN_BTN, ADMIN_BTN_TAB } from "@/lib/admin-button-classes";

export type AdminRequestsMainTab = "verification" | "connection";

const MAIN_TABS: { key: AdminRequestsMainTab; label: string }[] = [
  { key: "verification", label: "Верификация официантов" },
  { key: "connection", label: "Заявки на подключение" },
];

type Props = {
  value: AdminRequestsMainTab;
  onChange: (tab: AdminRequestsMainTab) => void;
  pendingVerification: number;
  pendingConnection: number;
  className?: string;
};

function MainTabBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      className="ml-2 inline-flex min-h-[1.35rem] min-w-[1.35rem] shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-red)] px-2 text-xs font-bold leading-none text-white tabular-nums ring-2 ring-black/25"
      title={`Новых на рассмотрении: ${n}`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AdminRequestsMainTabs({
  value,
  onChange,
  pendingVerification,
  pendingConnection,
  className = "",
}: Props) {
  return (
    <div className={`flex flex-wrap justify-center gap-2 ${className}`.trim()}>
      {MAIN_TABS.map(({ key, label }) => {
        const pending = key === "verification" ? pendingVerification : pendingConnection;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`${ADMIN_BTN} ${ADMIN_BTN_TAB} max-w-full px-4 py-2.5 text-center text-sm font-semibold sm:px-5 ${
              value === key ? "admin-btn--primary" : ""
            }`}
          >
            <span className="text-balance">{label}</span>
            <MainTabBadge n={pending} />
          </button>
        );
      })}
    </div>
  );
}
