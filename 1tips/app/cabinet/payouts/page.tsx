"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatDate } from "@/lib/utils";
import { FileDown } from "lucide-react";
import { PAYOUT_STATUS_LABEL } from "../shared";

type Payout = { id: string; amountKop: number; status: string; createdAt: string; details: string };

function truncateDetails(s: string, max = 40): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

export default function CabinetPayoutsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/payouts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("accessToken");
          router.replace("/login");
          return;
        }
        if (!res.ok) {
          setError("Не удалось загрузить данные");
          return;
        }
        const data = (await res.json()) as { payouts: Payout[] };
        setPayouts(data.payouts);
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleDownloadReceipt = async (payoutId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setDownloadingId(payoutId);
    setError(null);
    try {
      const res = await fetch(`/api/payouts/${payoutId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Не удалось скачать чек");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chek-vyvod-${payoutId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось скачать чек");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border-0 bg-[var(--color-muted)]/10 p-4 text-sm text-[var(--color-text-secondary)]">
          {error}
        </div>
      )}

      <div className="cabinet-card overflow-hidden rounded-xl border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)]">
        <div className="border-0 px-6 py-5">
          <h2 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">
            Заявки на вывод
          </h2>
        </div>
        {payouts.length === 0 ? (
          <div className="px-6 py-12 text-center text-[var(--color-text-secondary)]">Заявок пока нет</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="border-0 bg-[var(--color-dark-gray)]/10">
                <tr>
                  <th className="px-5 py-4 font-semibold text-[var(--color-text)]">Дата</th>
                  <th className="px-5 py-4 font-semibold text-[var(--color-text)]">Сумма</th>
                  <th className="px-5 py-4 font-semibold text-[var(--color-text)]">Реквизиты</th>
                  <th className="px-5 py-4 font-semibold text-[var(--color-text)]">Статус</th>
                  <th className="px-5 py-4 font-semibold text-[var(--color-text)]">Чек</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-0 transition-colors last:border-0 hover:bg-[var(--color-dark-gray)]/8"
                  >
                    <td className="px-5 py-4 text-[var(--color-text-secondary)]">
                      {formatDate(p.createdAt, { includeYear: true })}
                    </td>
                    <td className="px-5 py-4 font-semibold text-[var(--color-text)]">
                      {formatMoney(BigInt(p.amountKop))}
                    </td>
                    <td
                      className="max-w-[200px] truncate px-5 py-4 text-[var(--color-text-secondary)]"
                      title={p.details}
                    >
                      {truncateDetails(p.details)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          p.status === "COMPLETED"
                            ? "bg-[var(--color-dark-gray)]/10 text-[var(--color-text)]"
                            : p.status === "REJECTED"
                              ? "bg-[var(--color-muted)]/15 text-[var(--color-text-secondary)]"
                              : p.status === "PROCESSING"
                                ? "bg-[var(--color-dark-gray)]/10 text-[var(--color-text-secondary)]"
                                : "bg-[var(--color-dark-gray)]/10 text-[var(--color-text)]"
                        }`}
                      >
                        {PAYOUT_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {p.status === "COMPLETED" ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadReceipt(p.id)}
                          disabled={downloadingId === p.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border-0 px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition-all hover:bg-[var(--color-dark-gray)]/10 disabled:opacity-50"
                        >
                          <FileDown className="h-4 w-4" />
                          {downloadingId === p.id ? "…" : "PDF"}
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-xl border-0 bg-[var(--color-dark-gray)]/6 px-3 py-2 text-xs text-[var(--color-muted)]"
                          title="Доступно после выполнения вывода"
                        >
                          <FileDown className="h-4 w-4" />
                          PDF
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
