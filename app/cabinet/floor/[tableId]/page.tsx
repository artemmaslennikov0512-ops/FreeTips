"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Minus, Plus, Trash2 } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

interface MenuItem {
  id: string;
  name: string;
  priceKop: string;
  isAvailable: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface OrderLine {
  id: string;
  nameSnapshot: string;
  priceKopSnapshot: string;
  quantity: number;
  comment: string | null;
}

interface OrderState {
  id: string;
  status: string;
  totalKop: string;
  presentedAt: string | null;
  lines: OrderLine[];
}

interface TableInfo {
  id: string;
  label: string;
  capacity: number;
  hallName: string;
}

interface SessionInfo {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  mySession: boolean;
  openedAt: string;
  blocked?: boolean;
}

function formatRub(kopStr: string): string {
  const n = Number(BigInt(kopStr || "0")) / 100;
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ₽";
}

export default function CabinetFloorTablePage() {
  const params = useParams();
  const tableId = typeof params.tableId === "string" ? params.tableId : "";

  const [table, setTable] = useState<TableInfo | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [order, setOrder] = useState<OrderState | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tableId) return;
    setLoading(true);
    setError(null);
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`/api/cabinet/establishment/tables/${tableId}`, { headers: authHeaders() }),
        fetch("/api/cabinet/establishment/menu", { headers: authHeaders() }),
      ]);
      const tData = await tRes.json().catch(() => ({}));
      const mData = await mRes.json().catch(() => ({}));
      if (!tRes.ok) {
        setError(tData?.error ?? "Ошибка загрузки стола");
        setTable(null);
        setSession(null);
        setOrder(null);
        return;
      }
      setTable(tData.table ?? null);
      setSession(tData.session ?? null);
      setOrder(tData.order ?? null);
      if (mRes.ok) {
        setMenu(mData.categories ?? []);
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    load();
  }, [load]);

  const editable = order?.status === "OPEN";

  const openTable = async () => {
    if (!tableId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cabinet/establishment/tables/${tableId}/open`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось открыть стол");
        return;
      }
      await load();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  const addLine = async (menuItemId: string) => {
    if (!order?.id || !editable) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cabinet/establishment/orders/${order.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ menuItemId, quantity: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось добавить позицию");
        return;
      }
      await load();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  const setQty = async (lineId: string, quantity: number) => {
    if (!order?.id || !editable) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cabinet/establishment/orders/${order.id}/lines/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка");
        return;
      }
      await load();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  const removeLine = async (lineId: string) => {
    if (!order?.id || !editable) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cabinet/establishment/orders/${order.id}/lines/${lineId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Ошибка");
        return;
      }
      await load();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  const presentBill = async () => {
    if (!order?.id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cabinet/establishment/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: "PRESENTED" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка");
        return;
      }
      await load();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  const closeTable = async () => {
    if (!session?.id) return;
    if (!confirm("Закрыть стол? Сессия обслуживания завершится.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cabinet/establishment/service-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка");
        return;
      }
      window.location.href = "/cabinet/floor";
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  const toggleCat = (id: string) => {
    setOpenCats((p) => ({ ...p, [id]: !p[id] }));
  };

  if (!tableId) {
    return <p className="text-sm text-[var(--color-text)]/70">Некорректная ссылка</p>;
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-5 pb-8">
      <Link
        href="/cabinet/floor"
        className="inline-flex w-fit items-center gap-1 text-sm text-[var(--color-text)]/70 hover:text-[var(--color-text)]"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Зал
      </Link>

      {loading ? (
        <p className="text-sm text-[var(--color-text)]/70">Загрузка…</p>
      ) : !table ? (
        <p className="text-sm text-[var(--color-text)]/70">Стол не найден</p>
      ) : (
        <>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              {table.hallName} · стол {table.label}
            </h1>
            <p className="text-sm text-[var(--color-text)]/65">До {table.capacity} гостей</p>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
          ) : null}

          {session?.blocked ? (
            <div className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Стол обслуживает {session.employeeName ?? "другой официант"}. Заказ недоступен для просмотра.
            </div>
          ) : null}

          {!session?.blocked && !session ? (
            <button
              type="button"
              disabled={busy}
              onClick={openTable}
              className="rounded-xl bg-[var(--color-brand-gold)] px-4 py-3 text-sm font-semibold text-[#0a192f] disabled:opacity-50"
            >
              Открыть стол
            </button>
          ) : null}

          {!session?.blocked && session && !order ? (
            <button
              type="button"
              disabled={busy}
              onClick={openTable}
              className="rounded-xl border border-[var(--color-brand-gold)]/40 px-4 py-2 text-sm text-[var(--color-text)] disabled:opacity-50"
            >
              Начать заказ
            </button>
          ) : null}

          {!session?.blocked && order ? (
            <>
              <section className="rounded-lg border border-[var(--color-brand-gold)]/25 bg-[var(--color-dark-gray)]/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-[var(--color-text)]">Заказ</h2>
                  <span className="text-lg font-semibold text-[var(--color-brand-gold)]">{formatRub(order.totalKop)}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text)]/60">
                  {order.status === "OPEN" && "Редактирование"}
                  {order.status === "PRESENTED" && "Пречек выставлен"}
                  {order.status === "CANCELLED" && "Отменён"}
                </p>
                <ul className="mt-3 space-y-2">
                  {order.lines.map((ln) => (
                    <li
                      key={ln.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 first:border-t-0 first:pt-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--color-text)]">{ln.nameSnapshot}</p>
                        <p className="text-xs text-[var(--color-text)]/55">
                          {formatRub(ln.priceKopSnapshot)} × {ln.quantity}
                        </p>
                      </div>
                      {editable ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy || ln.quantity <= 1}
                            onClick={() => setQty(ln.id, ln.quantity - 1)}
                            className="rounded-lg p-1.5 text-[var(--color-text)]/80 hover:bg-white/10 disabled:opacity-30"
                            aria-label="Меньше"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-6 text-center text-sm">{ln.quantity}</span>
                          <button
                            type="button"
                            disabled={busy || ln.quantity >= 99}
                            onClick={() => setQty(ln.id, ln.quantity + 1)}
                            className="rounded-lg p-1.5 text-[var(--color-text)]/80 hover:bg-white/10"
                            aria-label="Больше"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removeLine(ln.id)}
                            className="rounded-lg p-1.5 text-red-300/90 hover:bg-red-500/20"
                            aria-label="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {order.lines.length === 0 ? <p className="mt-2 text-sm text-[var(--color-text)]/55">Пока пусто</p> : null}
              </section>

              {editable ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || order.lines.length === 0}
                    onClick={presentBill}
                    className="rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#0a192f] disabled:opacity-40"
                  >
                    Выставить пречек
                  </button>
                </div>
              ) : null}

              {editable && menu.length > 0 ? (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Меню</h2>
                  <div className="flex flex-col gap-1">
                    {menu.map((c) => (
                      <div key={c.id} className="rounded-lg border border-white/10 bg-[var(--color-dark-gray)]/5">
                        <button
                          type="button"
                          onClick={() => toggleCat(c.id)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-[var(--color-text)]"
                        >
                          {c.name}
                          <span className="text-[var(--color-text)]/50">{openCats[c.id] ? "−" : "+"}</span>
                        </button>
                        {openCats[c.id] ? (
                          <ul className="border-t border-white/10 px-2 py-1">
                            {c.items
                              .filter((it) => it.isAvailable)
                              .map((it) => (
                                <li key={it.id} className="flex items-center justify-between gap-2 py-1.5">
                                  <span className="text-sm text-[var(--color-text)]/90">{it.name}</span>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => addLine(it.id)}
                                    className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-xs text-[var(--color-text)] hover:bg-white/15 disabled:opacity-40"
                                  >
                                    + {formatRub(it.priceKop)}
                                  </button>
                                </li>
                              ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : editable && menu.length === 0 ? (
                <p className="text-sm text-[var(--color-text)]/60">Меню заведения пустое — добавьте позиции в кабинете управляющего.</p>
              ) : null}

              {(order.status === "PRESENTED" || order.status === "OPEN") && session ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={closeTable}
                  className="rounded-xl border border-white/20 px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-white/5 disabled:opacity-40"
                >
                  Закрыть стол
                </button>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
