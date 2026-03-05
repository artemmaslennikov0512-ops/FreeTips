"use client";

import { useEffect, useState, useMemo, Fragment, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { feeKopForPayout } from "@/lib/payment/paygine-fee";
import { Stats, cabinetInputClassName } from "../shared";
import { PremiumCard } from "../PremiumCard";

type Operation = {
  id: string;
  type: "tip" | "payout";
  amountKop: number;
  feeKop: number;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
};

function operationStatusKind(op: Operation): "success" | "pending" | "failed" {
  if (op.type === "tip") {
    if (op.status === "SUCCESS") return "success";
    if (op.status === "PENDING") return "pending";
    return "failed";
  }
  if (op.status === "COMPLETED") return "success";
  if (op.status === "CREATED" || op.status === "PROCESSING") return "pending";
  return "failed";
}

function StatusIcon({ op }: { op: Operation }) {
  const kind = operationStatusKind(op);
  if (kind === "success") {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
      </span>
    );
  }
  if (kind === "pending") {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15">
        <Clock className="h-4 w-4 text-amber-600" aria-hidden />
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15">
      <XCircle className="h-4 w-4 text-red-600" aria-hidden />
    </span>
  );
}

const PER_PAGE = 10;

function getDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDayLabel(isoDateKey: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDateKey + "T12:00:00"));
}

export default function CabinetTransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Operation[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sdPageAmount, setSdPageAmount] = useState("");
  const [sdPageLoading, setSdPageLoading] = useState(false);
  const [sdPageError, setSdPageError] = useState<string | null>(null);
  const [sdPageNewTabHint, setSdPageNewTabHint] = useState(false);
  const [maxPayoutPerRequestKop, setMaxPayoutPerRequestKop] = useState<number>(10_000_000);

  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const paginatedList = useMemo(
    () => list.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
    [list, currentPage]
  );
  const byDay = useMemo(() => {
    const map = new Map<string, Operation[]>();
    for (const op of paginatedList) {
      const key = getDateKey(op.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(op);
    }
    return { map, days: Array.from(map.keys()).sort((a, b) => b.localeCompare(a)) };
  }, [paginatedList]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, Math.ceil(list.length / PER_PAGE))));
  }, [list.length]);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const res = await fetch("/api/operations?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError("Не удалось загрузить историю");
        return;
      }
      const data = (await res.json()) as { operations: Operation[]; total: number };
      setList(data.operations);
      setTotal(data.total);

      const profileRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as { stats?: Stats; maxPayoutPerRequestKop?: number };
        setStats(profile.stats ?? null);
        if (typeof profile.maxPayoutPerRequestKop === "number" && profile.maxPayoutPerRequestKop > 0) {
          setMaxPayoutPerRequestKop(profile.maxPayoutPerRequestKop);
        }
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [router, fetchData]);

  // Обновление баланса и списка при возврате на вкладку (после зачислений/списаний)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && localStorage.getItem("accessToken")) {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData]);

  // Периодическое обновление баланса и операций, пока вкладка видна (актуализация после зачислений/списаний)
  const BALANCE_POLL_INTERVAL_MS = 25_000;
  useEffect(() => {
    if (!localStorage.getItem("accessToken")) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    }, BALANCE_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleSDPayOutPage = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    const rub = parseFloat(sdPageAmount);
    if (!rub || rub <= 0) {
      setSdPageError("Введите корректную сумму");
      return;
    }
    const amountKop = Math.round(rub * 100);
    if (amountKop < 10000) {
      setSdPageError("Минимальная сумма вывода 100 ₽");
      return;
    }
    if (amountKop > maxPayoutPerRequestKop) {
      setSdPageError(`Сумма превышает лимит (макс. ${(maxPayoutPerRequestKop / 100).toLocaleString("ru-RU")} ₽)`);
      return;
    }
    setSdPageLoading(true);
    setSdPageError(null);
    try {
      const res = await fetch("/api/payouts/sd-pay-out-page", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ amountKop }),
      });
      const data = (await res.json()) as {
        formUrl?: string;
        formFields?: Record<string, string>;
        error?: string;
        code?: string;
        description?: string;
      };
      if (!res.ok) {
        setSdPageError(data.error ?? data.description ?? "Ошибка при создании заявки");
        return;
      }
      if (!data.formUrl || !data.formFields) {
        setSdPageError("Некорректный ответ сервера");
        return;
      }
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.formUrl;
      form.target = "_blank"; // открыть страницу Paygine в новой вкладке, текущий сайт остаётся открыт
      form.style.display = "none";
      for (const [name, value] of Object.entries(data.formFields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      setSdPageNewTabHint(true);
      setTimeout(() => setSdPageNewTabHint(false), 8000);
    } catch {
      setSdPageError("Ошибка соединения");
    } finally {
      setSdPageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <div className="text-white/90">Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {stats && (
        <div className="grid items-stretch gap-8 lg:grid-cols-1">
          <div id="waiter-card" className="cabinet-card rounded-xl border-0 bg-[var(--color-bg-sides)] overflow-hidden shadow-[var(--shadow-subtle)]">
            <div className="border-0 px-6 py-4 text-center">
              <h3 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white">Карта официанта</h3>
            </div>
            <div className="p-6">
              <div className="overflow-hidden rounded-2xl">
                <PremiumCard balanceKop={stats.balanceKop} compact hideButtons />
              </div>
              <div className="mt-8 flex flex-col items-center gap-4">
                <p className="text-center text-sm text-white">
                  Введите сумму не больше {(maxPayoutPerRequestKop / 100).toLocaleString("ru-RU")} ₽
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <input
                    type="number"
                    step="0.01"
                    min="100"
                    max={maxPayoutPerRequestKop / 100}
                    value={sdPageAmount}
                    onChange={(e) => { setSdPageAmount(e.target.value); setSdPageError(null); }}
                    placeholder={`От 100 до ${(maxPayoutPerRequestKop / 100).toLocaleString("ru-RU")} ₽`}
                    className={`min-w-[240px] max-w-full rounded-xl border bg-white px-5 py-3 text-[#0a192f] placeholder:text-[var(--color-text-secondary)]/70 focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none overflow-hidden ${
                      sdPageAmount && parseFloat(sdPageAmount) > maxPayoutPerRequestKop / 100
                        ? "border-red-500 focus:ring-red-500/40"
                        : "border-[var(--color-brand-gold)]/30 focus:ring-[var(--color-brand-gold)]/40"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSDPayOutPage}
                    disabled={
                      sdPageLoading ||
                      !sdPageAmount ||
                      parseFloat(sdPageAmount) < 100 ||
                      Math.round(parseFloat(sdPageAmount) * 100) > maxPayoutPerRequestKop
                    }
                    className="cabinet-btn-gold w-auto rounded-xl bg-[var(--color-brand-gold)] px-6 py-3 font-semibold text-[#0a192f] transition-all hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {sdPageLoading ? "Переход…" : "Вывести средства"}
                  </button>
                </div>
                {sdPageAmount && parseFloat(sdPageAmount) > 0 && Math.round(parseFloat(sdPageAmount) * 100) > maxPayoutPerRequestKop && (
                  <p className="text-center text-sm font-medium text-red-600" role="alert">
                    Сумма превышает лимит (макс. {(maxPayoutPerRequestKop / 100).toLocaleString("ru-RU")} ₽)
                  </p>
                )}
                {(() => {
                  const hasValidAmount = sdPageAmount && parseFloat(sdPageAmount) > 0 && Math.round(parseFloat(sdPageAmount) * 100) <= maxPayoutPerRequestKop;
                  const amountKop = hasValidAmount && sdPageAmount ? Math.round(parseFloat(sdPageAmount) * 100) : 0;
                  const feeKop = hasValidAmount ? feeKopForPayout(amountKop) : 0;
                  const totalKop = amountKop + feeKop;
                  return (
                    <div className="waiter-card-summary cabinet-block-inner w-full max-w-sm rounded-xl border border-[var(--color-brand-gold)]/20 px-5 py-4 text-sm text-white shadow-sm">
                      <div className="flex justify-between text-white">
                        <span>К зачислению на карту:</span>
                        <span className="font-medium">{hasValidAmount ? formatMoney(BigInt(amountKop)) : "—"}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-white">
                        <span>Комиссия (1,2%):</span>
                        <span className="font-medium">{hasValidAmount ? formatMoney(BigInt(feeKop)) : "—"}</span>
                      </div>
                      <div className="mt-2 flex justify-between font-medium text-white">
                        <span>С баланса будет списано:</span>
                        <span>{hasValidAmount ? formatMoney(BigInt(totalKop)) : "—"}</span>
                      </div>
                    </div>
                  );
                })()}
                {sdPageError && (
                  <p className="rounded-lg bg-red-500/15 px-4 py-2 text-sm font-medium text-red-600 text-center" role="alert">
                    {sdPageError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border-0 bg-[var(--color-muted)]/10 p-4 text-sm text-white/90">
          {error}
        </div>
      )}

      {sdPageNewTabHint && (
        <div className="rounded-xl border border-[var(--color-brand-gold)]/30 bg-[var(--color-brand-gold)]/10 px-4 py-3 text-sm text-white">
          Открыта новая вкладка — введите данные карты на странице Paygine. После завершения вы вернётесь на этот сайт.
        </div>
      )}

      <div id="operations-history" className="cabinet-card overflow-hidden rounded-xl border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)]">
        <div className="border-0 px-6 py-5">
          <h3 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white">
            История операций
          </h3>
        </div>
        {list.length === 0 ? (
          <div className="px-6 py-12 text-center text-white/90">Операций пока нет</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm text-white">
                <thead className="bg-[var(--color-dark-gray)]/10">
                  <tr className="border-b border-[var(--color-brand-gold)]/20">
                    <th className="px-5 py-4 font-semibold text-white">Дата</th>
                    <th className="px-5 py-4 font-semibold text-white">Тип</th>
                    <th className="px-5 py-4 font-semibold text-white">Сумма</th>
                    <th className="px-5 py-4 font-semibold text-white">Комиссия</th>
                    <th className="px-5 py-4 font-semibold text-white">Итоговая сумма</th>
                    <th className="px-5 py-4 font-semibold text-white">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.days.map((dayKey) => (
                    <Fragment key={dayKey}>
                      <tr className="border-b border-[var(--color-brand-gold)]/20">
                        <td colSpan={6} className="px-5 py-3 text-center">
                          <span className="inline-block rounded-lg bg-[var(--color-brand-gold)] px-4 py-1.5 text-sm font-semibold text-[#0a192f]">
                            {formatDayLabel(dayKey)}
                          </span>
                        </td>
                      </tr>
                      {(byDay.map.get(dayKey) ?? []).map((op) => (
                        <tr
                          key={`${op.type}-${op.id}`}
                          className="border-b border-[var(--color-brand-gold)]/20 transition-colors hover:bg-[var(--color-dark-gray)]/8"
                        >
                          <td className="px-5 py-4 text-white/90">
                            {formatDate(op.createdAt, { includeYear: true })}
                          </td>
                          <td className="px-5 py-4 text-white">
                            {op.type === "tip" ? "Пополнение" : "Списание"}
                          </td>
                          <td className="px-5 py-4 font-semibold text-white">
                            {formatMoney(BigInt(op.amountKop))}
                          </td>
                          <td className="px-5 py-4 text-white/90">
                            {op.feeKop ? formatMoney(BigInt(op.feeKop)) : "—"}
                          </td>
                          <td className="px-5 py-4 font-medium text-white">
                            {formatMoney(BigInt(op.amountKop + op.feeKop))}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1">
                              <StatusIcon op={op} />
                              {op.type === "payout" && op.status === "REJECTED" && op.rejectionReason && (
                                <span className="max-w-[200px] text-xs text-white/80" title={op.rejectionReason}>
                                  {op.rejectionReason}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-brand-gold)]/20 px-6 py-4">
                <p className="text-sm text-white/90">
                  Показано {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, list.length)} из {list.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg border border-[var(--color-brand-gold)]/20 bg-transparent px-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-dark-gray)]/10 disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Предыдущая страница"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-white/90">
                    {currentPage} из {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg border border-[var(--color-brand-gold)]/20 bg-transparent px-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-dark-gray)]/10 disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Следующая страница"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {list.length > 0 && total > list.length && (
        <p className="mt-2 text-sm text-white/90">
          Загружено {list.length} из {total} операций. Перелистывайте страницы для просмотра.
        </p>
      )}
    </div>
  );
}
