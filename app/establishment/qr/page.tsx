"use client";

import { useEffect, useState, useCallback } from "react";
import { FileDown, QrCode, ImageIcon, X } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

export default function EstablishmentQrPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ name: string; employeesCount: number } | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
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
        const infoData = await infoRes.json();
        const empData = await empRes.json();
        setInfo({ name: infoData.name, employeesCount: infoData.employeesCount ?? 0 });
        const active = (empData.employees ?? []).filter((e: { isActive: boolean }) => e.isActive).length;
        setActiveCount(active);
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  if (error || !info) {
    return (
      <div className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
        {error ?? "Заведение не найдено"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white text-center">
        QR и печать
      </h1>

      <div className="cabinet-card rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-gold)]/20 text-[var(--color-brand-gold)]">
            <QrCode className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-medium text-white">Карточки для печати</h2>
            <p className="mt-1 text-sm text-white/90">
              Скачайте PDF с карточками сотрудников в стиле страницы оплаты: фон и цвета вашего заведения,
              логотип, название и бренд. Каждая карточка — как мини-страница чаевых с QR-кодом для гостя.
            </p>
            <p className="mt-2 text-sm text-white/70">
              Настройте цвета и логотип в разделе «Бренд» — они будут использованы в карточках.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
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
            {previewLoading ? "Загрузка…" : "Предпросмотр"}
          </button>
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

        {activeCount === 0 && (
          <p className="mt-4 text-sm text-amber-200">
            Нет активных сотрудников. Добавьте сотрудников в разделе «Команда» и включите им статус «Активен».
          </p>
        )}
      </div>
    </div>
  );
}
