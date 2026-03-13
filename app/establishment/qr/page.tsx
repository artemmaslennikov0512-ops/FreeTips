"use client";

import { useEffect, useState, useCallback } from "react";
import { FileDown, ImageIcon, X } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";
import { getBaseUrl } from "@/lib/get-base-url";

export default function EstablishmentQrPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [exampleSlug, setExampleSlug] = useState<string | null>(null);
  const [exampleQrUrl, setExampleQrUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [infoRes, empRes] = await Promise.all([
          fetch("/api/establishment/info", { headers: authHeaders() }),
          fetch("/api/establishment/employees", { headers: authHeaders() }),
        ]);
        if (!infoRes.ok || !empRes.ok) {
          setError("Ошибка загрузки");
          return;
        }
        const empData = await empRes.json();
        const employees = empData.employees ?? [];
        const active = employees.filter((e: { isActive: boolean }) => e.isActive);
        setActiveCount(active.length);
        const first = active[0];
        if (first?.qrCodeIdentifier) {
          setExampleSlug(first.qrCodeIdentifier);
        }
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !exampleSlug) return;
    const url = `${getBaseUrl()}/pay/${exampleSlug}`;
    import("qrcode")
      .then((m) => m.default.toDataURL(url, { width: 160, margin: 1 }))
      .then(setExampleQrUrl)
      .catch(() => {});
  }, [exampleSlug]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/establishment/employees/pdf", { headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "Ошибка загрузки PDF");
        setDownloading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qr-cards.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Ошибка загрузки");
    } finally {
      setDownloading(false);
    }
  };

  const openPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPdfPreviewUrl(null);
    try {
      const res = await fetch("/api/establishment/employees/pdf", { headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "Ошибка загрузки");
        setPreviewLoading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch {
      alert("Ошибка загрузки");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  }, [pdfPreviewUrl]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  if (loading) {
    return <div className="text-white/90">Загрузка…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
        {error}
      </div>
    );
  }

  const examplePayLink = exampleSlug ? `${getBaseUrl()}/pay/${exampleSlug}` : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white text-center">
        QR и печать
      </h1>
      <p className="text-white/90 text-sm text-center">
        Ссылки для оплаты и карточки для печати. Вид карточки настраивается в разделе «Бренд».
      </p>

      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden flex flex-col items-center text-center">
        <div className="border-b border-white/10 px-4 py-3 w-full">
          <span className="text-sm font-medium text-white/90">Ссылка и QR для чаевых</span>
        </div>
        <div className="p-6 space-y-4 w-full max-w-lg flex flex-col items-center">
          {examplePayLink ? (
            <>
              <div className="flex flex-col items-center w-full">
                <label className="block text-xs text-white/70 mb-1">Пример ссылки (один из сотрудников)</label>
                <a
                  href={examplePayLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate max-w-full text-sm text-[var(--color-brand-gold)] hover:underline text-center"
                >
                  {examplePayLink}
                </a>
              </div>
              {exampleQrUrl && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-white/70">QR-код этой ссылки</span>
                  <img src={exampleQrUrl} alt="" className="w-40 h-40 rounded-lg bg-white p-1" />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-white/70">
              Нет активных сотрудников. Добавьте в разделе «Команда» и включите статус «Активен» — здесь появится пример ссылки и QR.
            </p>
          )}

          <div className="border-t border-white/10 pt-4 w-full flex flex-col items-center">
            <p className="text-xs text-white/70 mb-3">Скачать PDF со всеми карточками для печати (лого, имя, QR по каждому сотруднику).</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={downloadPdf}
                disabled={downloading || activeCount === 0}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2.5 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
              >
                <FileDown className={`h-5 w-5 ${downloading ? "animate-pulse" : ""}`} />
                {downloading ? "Скачивание…" : "Скачать PDF"}
              </button>
              <button
                type="button"
                onClick={openPreview}
                disabled={activeCount === 0 || previewLoading}
                className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-2.5 font-medium text-white hover:bg-[var(--color-dark-gray)]/20 disabled:opacity-50"
              >
                <ImageIcon className={`h-5 w-5 ${previewLoading ? "animate-pulse" : ""}`} />
                {previewLoading ? "Загрузка…" : "Предпросмотр PDF"}
              </button>
            </div>
            {activeCount === 0 && (
              <p className="mt-2 text-sm text-amber-200 text-center">
                Нет активных сотрудников — PDF пока недоступен.
              </p>
            )}
          </div>
        </div>
      </div>

      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a192f]/95">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-brand-gold)]/20 bg-[var(--color-charcoal)] px-4 py-3">
            <span className="font-medium text-white">Предпросмотр PDF</span>
            <button
              type="button"
              onClick={closePreview}
              className="flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-2 font-medium text-white hover:bg-[var(--color-dark-gray)]/20"
            >
              <X className="h-5 w-5" /> Закрыть
            </button>
          </div>
          <iframe
            src={pdfPreviewUrl}
            title="Предпросмотр карточек"
            className="min-h-0 flex-1 w-full border-0"
          />
        </div>
      )}
    </div>
  );
}
