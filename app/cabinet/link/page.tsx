"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Link2, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/get-base-url";
import { getCsrfHeader } from "@/lib/security/csrf-client";

type LinkRow = { id: string; slug: string; createdAt: string };

export default function CabinetLinkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<LinkRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetch("/api/links", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("accessToken");
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
          setLink(links[0] ?? null);
          setError(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!link || typeof window === "undefined") return;
    const url = `${getBaseUrl()}/pay/${link.slug}`;
    QRCode.toDataURL(url, { width: 256, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [link]);

  const handleCreate = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...getCsrfHeader(),
        },
        body: "{}",
      });
      if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Ошибка создания");
        return;
      }
      const data = (await res.json()) as { link: LinkRow };
      setLink(data.link);
    } finally {
      setCreating(false);
    }
  };

  const linkUrl = link && typeof window !== "undefined" ? `${getBaseUrl()}/pay/${link.slug}` : "";

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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">Загрузка...</div>
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

      {!link ? (
        <div className="cabinet-card rounded-xl border-0 bg-[var(--color-bg-sides)] p-10 shadow-[var(--shadow-subtle)]">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-dark-gray)]/10">
              <Link2 className="h-8 w-8 text-[var(--color-text)]" />
            </div>
            <p className="text-[var(--color-text-secondary)]">У вас ещё нет ссылки для приёма чаевых.</p>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-6 py-3 font-semibold text-[#0a192f] transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Создать ссылку
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          <div id="link-payment" className="cabinet-card rounded-xl border-0 bg-[var(--color-bg-sides)] p-6 shadow-[var(--shadow-subtle)] transition-all hover:shadow-[var(--shadow-medium)]">
            <h2 className="mb-4 font-[family:var(--font-playfair)] text-xl font-semibold text-white">
              Ссылка для оплаты
            </h2>
            <div className="rounded-xl bg-[var(--color-dark-gray)]/6 p-5">
              <div className="mb-4 font-semibold text-white">Ваша ссылка для чаевых</div>
              <div className="cabinet-input-window mb-4 break-all rounded-lg border border-[var(--color-brand-gold)]/20 px-4 py-3 font-mono text-sm text-white/90">
                {linkUrl}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-5 py-2.5 font-semibold text-[#0a192f] transition-all hover:opacity-90 hover:-translate-y-0.5"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Скопировано" : "Копировать ссылку"}
                </button>
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download="freetips-qr.png"
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-gold)]/20 bg-white px-5 py-2.5 font-semibold text-[#0a192f] transition-all hover:bg-[var(--color-light-gray)]"
                  >
                    <Download className="h-4 w-4" />
                    Скачать QR
                  </a>
                )}
              </div>
            </div>
          </div>

          <div id="link-qr-card" className="cabinet-card rounded-xl border-0 bg-[var(--color-bg-sides)] p-6 shadow-[var(--shadow-subtle)] transition-all hover:shadow-[var(--shadow-medium)]">
            <h2 className="mb-4 font-[family:var(--font-playfair)] text-xl font-semibold text-white">
              QR-код
            </h2>
            <div className="flex flex-col items-start gap-4">
              {qrDataUrl ? (
                <>
                  <img
                    src={qrDataUrl}
                    alt="QR-код ссылки"
                    className="size-64 shrink-0 rounded-xl border-0 bg-[var(--color-bg-sides)] object-contain"
                    width={256}
                    height={256}
                  />
                  <a
                    href={qrDataUrl}
                    download="freetips-qr.png"
                    className="inline-flex items-center gap-2 rounded-xl border-0 px-5 py-2.5 font-semibold text-white transition-all hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                    Скачать PNG
                  </a>
                </>
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-xl border-0 bg-[var(--color-dark-gray)]/5 text-white/90">
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
