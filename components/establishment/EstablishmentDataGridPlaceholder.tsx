"use client";

/**
 * Пустая «таблица» под панелью поиска/действий — визуальный каркас, куда лягут данные.
 */
export function EstablishmentDataGridPlaceholder({
  columns,
  rows = 6,
  loading = false,
  footerNote,
}: {
  columns: readonly { label: string; colClassName?: string }[];
  rows?: number;
  loading?: boolean;
  footerNote?: string;
}) {
  const rowKeys = Array.from({ length: rows }, (_, i) => i);
  return (
    <div
      className={`min-w-0 w-full overflow-hidden rounded-lg border border-[var(--color-brand-gold)]/25 bg-[var(--establishment-charcoal)] shadow-[var(--shadow-subtle)] ${loading ? "opacity-95" : ""}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-[11px]" role="presentation">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.04]">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={`px-2.5 py-2 font-semibold uppercase tracking-[0.08em] text-[var(--color-on-dark-muted)] sm:px-3 ${col.colClassName ?? ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((i) => (
              <tr key={i} className="border-b border-white/[0.05] last:border-b-0">
                {columns.map((col, j) => (
                  <td key={`${i}-${col.label}`} className={`px-2.5 py-2.5 align-middle sm:px-3 ${col.colClassName ?? ""}`}>
                    <span
                      className={`block h-3 max-w-full rounded-sm bg-white/[0.07] sm:h-3.5 ${loading ? "animate-pulse" : ""} ${j === 0 ? "max-w-[min(14rem,92%)]" : "max-w-[min(10rem,88%)]"}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footerNote ? (
        <p className="border-t border-white/[0.06] px-3 py-2 text-center text-[11px] text-[var(--color-on-dark-muted)]">{footerNote}</p>
      ) : null}
    </div>
  );
}
