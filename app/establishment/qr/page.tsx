"use client";

import { useEffect, useState, useCallback } from "react";
import { FileDown, QrCode, ImageIcon, X } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

const DEFAULT_HEX = { primary: "#c9a227", secondary: "#0a192f", mainBg: "#0a192f", blocksBg: "#1e293b", font: "#fafafa", border: "#c5a372" };

export default function EstablishmentQrPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ name: string; employeesCount: number } | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [downloading, setDownloading] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [mainBackgroundColor, setMainBackgroundColor] = useState("");
  const [blocksBackgroundColor, setBlocksBackgroundColor] = useState("");
  const [fontColor, setFontColor] = useState("");
  const [borderColor, setBorderColor] = useState("");
  const [borderWidthPx, setBorderWidthPx] = useState(2);
  const [borderOpacityPercent, setBorderOpacityPercent] = useState(100);

  useEffect(() => {
    const load = async () => {
      try {
        const [infoRes, empRes, settingsRes] = await Promise.all([
          fetch("/api/establishment/info", { headers: authHeaders() }),
          fetch("/api/establishment/employees", { headers: authHeaders() }),
          fetch("/api/establishment/settings", { headers: authHeaders() }),
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
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setLogoUrl(settingsData.logoUrl ?? "");
          setPrimaryColor(settingsData.primaryColor ?? "");
          setSecondaryColor(settingsData.secondaryColor ?? "");
          setMainBackgroundColor(settingsData.mainBackgroundColor ?? "");
          setBlocksBackgroundColor(settingsData.blocksBackgroundColor ?? "");
          setFontColor(settingsData.fontColor ?? "");
          setBorderColor(settingsData.borderColor ?? "");
          setBorderWidthPx(settingsData.borderWidthPx ?? 2);
          setBorderOpacityPercent(settingsData.borderOpacityPercent ?? 100);
        }
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/establishment/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          logoUrl: logoUrl.trim() || null,
          primaryColor: primaryColor.trim() || null,
          secondaryColor: secondaryColor.trim() || null,
          mainBackgroundColor: mainBackgroundColor.trim() || null,
          blocksBackgroundColor: blocksBackgroundColor.trim() || null,
          fontColor: fontColor.trim() || null,
          borderColor: borderColor.trim() || null,
          borderWidthPx: borderWidthPx,
          borderOpacityPercent: borderOpacityPercent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error ?? "Ошибка сохранения");
        setSaving(false);
        return;
      }
      setLogoUrl(data.logoUrl ?? "");
      setPrimaryColor(data.primaryColor ?? "");
      setSecondaryColor(data.secondaryColor ?? "");
      setMainBackgroundColor(data.mainBackgroundColor ?? "");
      setBlocksBackgroundColor(data.blocksBackgroundColor ?? "");
      setFontColor(data.fontColor ?? "");
      setBorderColor(data.borderColor ?? "");
      setBorderWidthPx(data.borderWidthPx ?? 2);
      setBorderOpacityPercent(data.borderOpacityPercent ?? 100);
      setMessage("Сохранено. Эти настройки используются на карточках для печати и на странице оплаты.");
    } catch {
      setMessage("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  };

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

  const borderHex = borderColor && /^#[0-9A-Fa-f]{6}$/i.test(borderColor) ? borderColor : primaryColor && /^#[0-9A-Fa-f]{6}$/i.test(primaryColor) ? primaryColor : "#c5a572";
  const borderAlpha = borderOpacityPercent / 100;
  const borderRgba = (() => {
    const r = parseInt(borderHex.slice(1, 3), 16);
    const g = parseInt(borderHex.slice(3, 5), 16);
    const b = parseInt(borderHex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${borderAlpha})`;
  })();
  const borderWidth = Math.min(8, Math.max(0, borderWidthPx));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white text-center">
        QR и печать
      </h1>
      <p className="text-white/90 text-sm text-center max-w-xl mx-auto">
        Настройте вид карточки: так она будет на печатных QR и на странице оплаты. Слева — параметры, справа — превью.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Левая колонка: настройки карточки */}
        <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden order-2 lg:order-1">
          <div className="border-b border-white/10 px-4 py-3">
            <span className="text-sm font-medium text-white/90">Настройки карточки (QR и страница оплаты)</span>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {message && (
              <p className={`text-sm ${message.startsWith("Сохранено") ? "text-[var(--color-accent-emerald)]" : "text-[var(--color-accent-red)]"}`}>
                {message}
              </p>
            )}
            <div>
              <label className="block text-sm text-white/90 mb-1">URL логотипа</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
              />
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Основной цвет (hex)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={primaryColor.match(/^#[0-9A-Fa-f]{6}$/) ? primaryColor : DEFAULT_HEX.primary}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded border border-[var(--color-brand-gold)]/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder={DEFAULT_HEX.primary}
                  className="cabinet-input-window flex-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Доп. цвет / фон карточки (hex)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={secondaryColor.match(/^#[0-9A-Fa-f]{6}$/) ? secondaryColor : DEFAULT_HEX.secondary}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 rounded border border-[var(--color-brand-gold)]/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder={DEFAULT_HEX.secondary}
                  className="cabinet-input-window flex-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Фон страницы (hex)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={mainBackgroundColor.match(/^#[0-9A-Fa-f]{6}$/) ? mainBackgroundColor : DEFAULT_HEX.mainBg}
                  onChange={(e) => setMainBackgroundColor(e.target.value)}
                  className="h-10 w-14 rounded border border-[var(--color-brand-gold)]/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={mainBackgroundColor}
                  onChange={(e) => setMainBackgroundColor(e.target.value)}
                  placeholder={DEFAULT_HEX.mainBg}
                  className="cabinet-input-window flex-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Фон блоков (hex)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={blocksBackgroundColor.match(/^#[0-9A-Fa-f]{6}$/) ? blocksBackgroundColor : DEFAULT_HEX.blocksBg}
                  onChange={(e) => setBlocksBackgroundColor(e.target.value)}
                  className="h-10 w-14 rounded border border-[var(--color-brand-gold)]/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={blocksBackgroundColor}
                  onChange={(e) => setBlocksBackgroundColor(e.target.value)}
                  placeholder={DEFAULT_HEX.blocksBg}
                  className="cabinet-input-window flex-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Цвет текста (hex)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={fontColor.match(/^#[0-9A-Fa-f]{6}$/) ? fontColor : DEFAULT_HEX.font}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="h-10 w-14 rounded border border-[var(--color-brand-gold)]/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  placeholder={DEFAULT_HEX.font}
                  className="cabinet-input-window flex-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Цвет обводки (hex)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={borderColor.match(/^#[0-9A-Fa-f]{6}$/) ? borderColor : DEFAULT_HEX.border}
                  onChange={(e) => setBorderColor(e.target.value)}
                  className="h-10 w-14 rounded border border-[var(--color-brand-gold)]/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  placeholder={DEFAULT_HEX.border}
                  className="cabinet-input-window flex-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Толщина обводки (px)</label>
              <input
                type="number"
                min={0}
                max={8}
                value={borderWidthPx}
                onChange={(e) => setBorderWidthPx(Number(e.target.value) || 0)}
                className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
              />
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Прозрачность обводки: {borderOpacityPercent}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={borderOpacityPercent}
                onChange={(e) => setBorderOpacityPercent(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none bg-white/20 accent-[var(--color-brand-gold)]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2.5 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить настройки карточки"}
            </button>
          </form>
        </div>

        {/* Правая колонка: превью карточки и кнопки PDF */}
        <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden order-1 lg:order-2 lg:sticky lg:top-4">
          <div className="border-b border-white/10 px-4 py-3 text-center">
            <span className="text-sm font-medium text-white/90">Превью карточки (как на QR и странице оплаты)</span>
          </div>
          <div
            className="p-6 flex flex-col items-center gap-4 rounded-b-[10px]"
            style={{
              backgroundColor: mainBackgroundColor && /^#[0-9A-Fa-f]{6}$/i.test(mainBackgroundColor) ? mainBackgroundColor : undefined,
            }}
          >
            <div
              className="w-full max-w-sm rounded-xl p-4 transition-colors"
              style={{
                borderWidth: `${borderWidth}px`,
                borderStyle: "solid",
                borderColor: borderRgba,
                backgroundColor: secondaryColor && /^#[0-9A-Fa-f]{6}$/i.test(secondaryColor) ? secondaryColor : blocksBackgroundColor && /^#[0-9A-Fa-f]{6}$/i.test(blocksBackgroundColor) ? blocksBackgroundColor : undefined,
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-3 min-h-[32px]">
                {logoUrl.trim() && (
                  <img
                    src={logoUrl.trim()}
                    alt=""
                    className="h-8 w-auto max-w-[100px] object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <span
                  className="font-[family:var(--font-playfair)] text-lg font-bold"
                  style={{
                    color: fontColor && /^#[0-9A-Fa-f]{6}$/i.test(fontColor) ? fontColor : "inherit",
                  }}
                >
                  <span className="opacity-80">{logoUrl.trim() ? "" : "Free"}</span>
                  <span style={{ color: primaryColor && /^#[0-9A-Fa-f]{6}$/i.test(primaryColor) ? primaryColor : "var(--color-brand-gold)" }}>Tips</span>
                </span>
              </div>
              <div
                className="rounded-lg py-2 px-3 text-center text-sm"
                style={{
                  borderWidth: `${Math.min(4, borderWidth)}px`,
                  borderStyle: "solid",
                  borderColor: borderRgba,
                  backgroundColor: blocksBackgroundColor && /^#[0-9A-Fa-f]{6}$/i.test(blocksBackgroundColor) ? blocksBackgroundColor : "rgba(255,255,255,0.05)",
                  color: fontColor && /^#[0-9A-Fa-f]{6}$/i.test(fontColor) ? fontColor : "rgba(255,255,255,0.9)",
                }}
              >
                Имя официанта
              </div>
              <div className="flex gap-2 mt-3">
                <span
                  className="flex-1 rounded-lg py-1.5 text-center text-xs"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)", color: fontColor && /^#[0-9A-Fa-f]{6}$/i.test(fontColor) ? fontColor : "rgba(255,255,255,0.7)" }}
                >
                  50 ₽
                </span>
                <span
                  className="flex-1 rounded-lg py-1.5 text-center text-xs"
                  style={{
                    backgroundColor: primaryColor && /^#[0-9A-Fa-f]{6}$/i.test(primaryColor) ? `${primaryColor}33` : "rgba(255,255,255,0.2)",
                    color: fontColor && /^#[0-9A-Fa-f]{6}$/i.test(fontColor) ? fontColor : "#fff",
                  }}
                >
                  100 ₽
                </span>
              </div>
              <button
                type="button"
                disabled
                className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-[#0a192f]"
                style={{ backgroundColor: primaryColor && /^#[0-9A-Fa-f]{6}$/i.test(primaryColor) ? primaryColor : "var(--color-brand-gold)" }}
              >
                Оплатить 100 ₽
              </button>
            </div>

            <div className="w-full flex flex-col gap-3 mt-2">
              <p className="text-xs text-white/70 text-center">
                Скачайте PDF с карточками для печати или откройте предпросмотр.
              </p>
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
                <p className="text-sm text-amber-200 text-center">
                  Нет активных сотрудников. Добавьте в разделе «Команда» и включите статус «Активен».
                </p>
              )}
            </div>
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
