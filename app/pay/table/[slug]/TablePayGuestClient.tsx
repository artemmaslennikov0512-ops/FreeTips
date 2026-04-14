"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { TablePayGuestBranding, TablePayGuestLine, TablePayGuestPayload } from "@/lib/table-pay-guest-state";

function formatRub(kopStr: string): string {
  const n = Number(BigInt(kopStr || "0")) / 100;
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ₽";
}

function brandingVars(b: TablePayGuestBranding | null): React.CSSProperties {
  if (!b) return {};
  const o: React.CSSProperties & Record<string, string> = {};
  if (b.primaryColor) o["--table-pay-accent"] = b.primaryColor;
  if (b.fontColor) o["--table-pay-text"] = b.fontColor;
  if (b.mainBackgroundColor) o["--table-pay-bg"] = b.mainBackgroundColor;
  if (b.blocksBackgroundColor) o["--table-pay-card"] = b.blocksBackgroundColor;
  if (b.borderColor) o["--table-pay-border"] = b.borderColor;
  return o;
}

export default function TablePayGuestClient() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Exclude<TablePayGuestPayload, { state: "not_found" | "invalid_slug" }> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pay/table/${encodeURIComponent(slug)}`);
      const json = (await res.json().catch(() => ({}))) as TablePayGuestPayload & { error?: string };
      if (!res.ok) {
        setData(null);
        setError(json?.error ?? "Не удалось загрузить страницу");
        return;
      }
      if (json.state === "not_found" || json.state === "invalid_slug") {
        setData(null);
        setError("Стол не найден");
        return;
      }
      setData(json);
    } catch {
      setData(null);
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const style = useMemo(() => brandingVars(data?.branding ?? null), [data]);

  const logoUrl = data?.branding?.logoUrl?.trim() || null;
  const logoOpacity = data?.branding?.logoOpacityPercent;

  return (
    <div
      className="min-h-[100dvh] px-4 py-8 text-[var(--table-pay-text,var(--color-text))]"
      style={{
        ...style,
        backgroundColor: "var(--table-pay-bg, var(--color-bg))",
      }}
    >
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-[var(--color-muted)] no-underline hover:underline">
            На сайт
          </Link>
          <ThemeToggle />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Загрузка…
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        ) : data ? (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- внешний URL бренда заведения
                <img
                  src={logoUrl}
                  alt=""
                  className="h-16 w-auto max-w-[200px] object-contain"
                  style={{ opacity: logoOpacity != null ? logoOpacity / 100 : 1 }}
                />
              ) : (
                <UtensilsCrossed className="h-10 w-10 text-[var(--table-pay-accent,var(--color-brand-gold))]" aria-hidden />
              )}
              <h1 className="text-xl font-semibold">{data.establishmentName}</h1>
              <p className="text-sm text-[var(--color-muted)]">Стол {data.tableLabel}</p>
            </div>

            <div
              className="rounded-2xl border p-5 shadow-[var(--shadow-subtle)]"
              style={{
                borderColor: "var(--table-pay-border, var(--color-dark-gray))",
                backgroundColor: "var(--table-pay-card, var(--color-white))",
              }}
            >
              {data.state === "checkout" ? (
                <>
                  <p className="text-center text-sm text-[var(--color-muted)]">К оплате (меню)</p>
                  <p
                    className="mt-2 text-center text-3xl font-semibold tabular-nums"
                    style={{ color: "var(--table-pay-accent, var(--color-brand-gold))" }}
                  >
                    {formatRub(data.totalKop)}
                  </p>
                  {data.lines.length > 0 ? (
                    <ul className="mt-4 space-y-2 border-t border-[var(--color-dark-gray)]/15 pt-4 text-sm text-[var(--color-text)]">
                      {data.lines.map((l: TablePayGuestLine, i: number) => (
                        <li key={i} className="flex justify-between gap-3 leading-snug">
                          <span className="min-w-0 pr-2">
                            {l.nameSnapshot}
                            {l.quantity > 1 ? ` ×${l.quantity}` : ""}
                          </span>
                          <span className="shrink-0 tabular-nums text-[var(--color-text)]">
                            {formatRub(String(BigInt(l.priceKop) * BigInt(l.quantity)))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-4 text-center text-xs text-[var(--color-muted)] leading-relaxed">{data.message}</p>
                </>
              ) : (
                <p className="text-center text-sm leading-relaxed text-[var(--color-text)] [text-wrap:balance]">{data.message}</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
