"use client";

export type AdminRequestsMainTab = "verification" | "connection";

const MAIN_TABS: { key: AdminRequestsMainTab; label: string }[] = [
  { key: "verification", label: "Верификация официантов" },
  { key: "connection", label: "Заявки на подключение" },
];

type Props = {
  value: AdminRequestsMainTab;
  onChange: (tab: AdminRequestsMainTab) => void;
  /** Число заявок на рассмотрении в разделе (бейдж «новые»). */
  pendingVerification: number;
  pendingConnection: number;
  className?: string;
};

function MainTabBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-2 inline-flex min-h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-[var(--color-accent-red)] px-2 text-xs font-bold leading-none text-white tabular-nums">
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
            className={`inline-flex max-w-full items-center justify-center rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors sm:px-5 ${
              value === key
                ? "bg-[var(--color-brand-gold)] text-[#0a192f]"
                : "border border-white/20 bg-white/5 text-white/90 hover:bg-white/10"
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
