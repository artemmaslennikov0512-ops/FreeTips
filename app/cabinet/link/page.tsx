"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Copy, Download, Link2, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/get-base-url";
import { fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";
import { PANEL_CARD_TITLE_CABINET_XL_CENTERED } from "@/lib/panel-shell-visual-classes";
type LinkRow = { id: string; slug: string; createdAt: string };
const LINKS_PAGE_SIZE = 10;
const MAX_BULK_LINKS = 300;

export default function CabinetLinkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [createCount, setCreateCount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [allCopied, setAllCopied] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchWithAuth("/api/links")
      .then(async (res) => {
        if (res.status === 401) {
          clearAccessToken();
          router.replace("/login");
          return null;
        }
        if (!res.ok) {
          setError("Не удалось загрузить ссылку");
          return null;
        }
        const data = (await res.json()) as { links: LinkRow[] };
        return data.links;
      })
      .then((links) => {
        if (!cancelled && links) {
          setLinks(links);
          setSelectedSlug((prev) => {
            if (prev && links.some((l) => l.slug === prev)) return prev;
            return links[0]?.slug ?? null;
          });
          setPageIndex(0);
          setError(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  const selectedLink = useMemo(
    () => (selectedSlug ? links.find((item) => item.slug === selectedSlug) ?? null : null),
    [links, selectedSlug],
  );

  useEffect(() => {
    if (!selectedLink || typeof window === "undefined") return;
    const url = `${getBaseUrl()}/pay/${selectedLink.slug}`;
    QRCode.toDataURL(url, { width: 256, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [selectedLink]);

  const handleCreate = async () => {
    const normalizedCount = Number.parseInt(createCount, 10);
    if (!Number.isFinite(normalizedCount) || normalizedCount < 1 || normalizedCount > MAX_BULK_LINKS) {
      setError(`Введите количество от 1 до ${MAX_BULK_LINKS}`);
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ count: normalizedCount }),
      });
      if (res.status === 401) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Ошибка создания");
        return;
      }
      const data = (await res.json()) as { link?: LinkRow; links?: LinkRow[] };
      const createdLinks = data.links ?? (data.link ? [data.link] : []);
      if (createdLinks.length > 0) {
        setLinks((prev) => {
          const merged = [...createdLinks, ...prev];
          const unique = new Map<string, LinkRow>();
          for (const row of merged) unique.set(row.slug, row);
          return Array.from(unique.values());
        });
        setSelectedSlug(createdLinks[0].slug);
        setPageIndex(0);
      }
    } finally {
      setCreating(false);
    }
  };

  const linkUrl =
    selectedLink && typeof window !== "undefined"
      ? `${getBaseUrl()}/pay/${selectedLink.slug}`
      : "";

  const totalPages = Math.max(1, Math.ceil(links.length / LINKS_PAGE_SIZE));
  const pagedLinks = links.slice(
    pageIndex * LINKS_PAGE_SIZE,
    pageIndex * LINKS_PAGE_SIZE + LINKS_PAGE_SIZE,
  );

  const handleCopy = async () => {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать");
    }
  };

  const handleCopyAll = async () => {
    if (links.length === 0 || typeof window === "undefined") return;
    const allText = links.map((item) => `${getBaseUrl()}/pay/${item.slug}`).join("\n");
    try {
      await navigator.clipboard.writeText(allText);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать");
    }
  };

  if (loading) {
    return (
      <div className="cabinet-link-page-loading flex min-h-[40vh] flex-col items-center justify-center text-[var(--color-text-secondary)]">
        <div className="text-sm font-medium">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="cabinet-link-page-error rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-[var(--color-text-secondary)]">
          {error}
        </div>
      )}

      {links.length === 0 ? (
        <div className="cabinet-link-empty cabinet-card rounded-xl border-0 bg-[var(--color-bg-sides)] p-10 shadow-[var(--shadow-subtle)]">
          <div className="cabinet-m5-empty flex flex-col items-center gap-6 text-center">
            <div className="cabinet-link-empty-icon-wrap flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Link2 className="cabinet-link-empty-icon h-8 w-8 text-[var(--color-brand-gold)]" aria-hidden />
            </div>
            <p className="cabinet-link-empty-hint max-w-md text-base leading-relaxed text-[var(--color-text-secondary)]">
              У вас ещё нет ID для чаевых и ссылки для приёма чаевых.
            </p>
            <div className="flex flex-col items-center gap-3">
              <label
                htmlFor="bulk-create-count-empty"
                className="text-sm text-[var(--color-text-secondary)]"
              >
                Сколько ссылок сгенерировать (1–300)
              </label>
              <input
                id="bulk-create-count-empty"
                type="number"
                min={1}
                max={MAX_BULK_LINKS}
                value={createCount}
                onChange={(e) => setCreateCount(e.target.value)}
                className="w-40 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/6 px-3 py-2 text-center font-mono text-[var(--color-text)]"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className={`${CABINET_WAITER_BTN_INLINE} px-6 py-3 text-[15px]`}
              >
                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Сгенерировать ссылки
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          <div id="link-payment" className="cabinet-card rounded-xl border-0 bg-[var(--color-bg-sides)] p-6 shadow-[var(--shadow-subtle)] transition-all hover:shadow-[var(--shadow-medium)]">
            <h2 className={`mb-4 ${PANEL_CARD_TITLE_CABINET_XL_CENTERED}`}>
              Ваш ID для чаевых и оплата
            </h2>
            <div className="rounded-xl bg-[var(--color-dark-gray)]/6 p-5">
              <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-brand-gold)]/20 px-3 py-3">
                <div className="flex min-w-[220px] flex-1 flex-col gap-1">
                  <label htmlFor="bulk-create-count" className="text-sm text-[var(--color-text-secondary)]">
                    Количество для генерации (1–300)
                  </label>
                  <input
                    id="bulk-create-count"
                    type="number"
                    min={1}
                    max={MAX_BULK_LINKS}
                    value={createCount}
                    onChange={(e) => setCreateCount(e.target.value)}
                    className="rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/6 px-3 py-2 font-mono text-[var(--color-text)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className={`${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px]`}
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Сгенерировать
                </button>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className={`${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px]`}
                >
                  <Copy className="h-4 w-4" />
                  {allCopied ? "Все ссылки скопированы" : "Копировать все ссылки"}
                </button>
              </div>
              <div className="mb-2 font-semibold text-[var(--color-text)]">Ваш ID для чаевых</div>
              <div className="cabinet-input-window mb-4 break-all rounded-lg border border-[var(--color-brand-gold)]/20 px-4 py-3 font-mono text-base font-semibold tracking-wide text-[var(--color-text)]">
                {selectedLink?.slug}
              </div>
              <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">Ссылка для гостей</div>
              <div className="cabinet-input-window mb-4 break-all rounded-lg border border-[var(--color-brand-gold)]/20 px-4 py-3 font-mono text-sm text-[var(--color-text)]/90">
                {linkUrl}
              </div>
              <div className="mb-4 rounded-lg border border-[var(--color-brand-gold)]/20 px-3 py-3">
                <div className="mb-2 flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                  <span>Показано по 10. Всего: {links.length}</span>
                  <span>
                    Страница {pageIndex + 1} из {totalPages}
                  </span>
                </div>
                <div className="space-y-2">
                  {pagedLinks.map((item) => {
                    const itemUrl = `${getBaseUrl()}/pay/${item.slug}`;
                    const isSelected = selectedLink?.slug === item.slug;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedSlug(item.slug)}
                        className={`block w-full break-all rounded-md border px-3 py-2 text-left font-mono text-xs ${
                          isSelected
                            ? "border-[var(--color-brand-gold)]/50 bg-[var(--color-brand-gold)]/10 text-[var(--color-text)]"
                            : "border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/6 text-[var(--color-text)]/90"
                        }`}
                      >
                        {itemUrl}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={pageIndex === 0}
                    onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                    className={`${CABINET_WAITER_BTN_INLINE} px-3 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Назад
                  </button>
                  <button
                    type="button"
                    disabled={pageIndex >= totalPages - 1}
                    onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                    className={`${CABINET_WAITER_BTN_INLINE} px-3 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Далее
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px]`}
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Скопировано" : "Копировать ссылку для гостей"}
                </button>
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download="freetips-qr.png"
                    className={`${CABINET_WAITER_BTN_INLINE} px-5 py-2.5 text-[14px]`}
                  >
                    <Download className="h-4 w-4" />
                    Скачать QR
                  </a>
                )}
              </div>
            </div>
          </div>

          <div id="link-qr-card" className="cabinet-card rounded-xl border-0 bg-[var(--color-bg-sides)] p-6 shadow-[var(--shadow-subtle)] transition-all hover:shadow-[var(--shadow-medium)]">
            <h2 className={`mb-4 ${PANEL_CARD_TITLE_CABINET_XL_CENTERED}`}>
              QR-код
            </h2>
            <div className="flex flex-col items-center gap-4">
              {qrDataUrl ? (
                <>
                  <Image
                    src={qrDataUrl}
                    alt="QR-код ссылки"
                    width={256}
                    height={256}
                    unoptimized
                    className="size-64 shrink-0 rounded-xl border-0 bg-[var(--color-bg-sides)] object-contain"
                  />
                  <a
                    href={qrDataUrl}
                    download="freetips-qr.png"
                    className="inline-flex items-center gap-2 rounded-xl border-0 px-5 py-2.5 font-semibold text-[var(--color-text)] transition-all hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                    Скачать PNG
                  </a>
                </>
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-xl border-0 bg-[var(--color-dark-gray)]/5 text-[var(--color-text)]/90">
                  Загрузка QR…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
