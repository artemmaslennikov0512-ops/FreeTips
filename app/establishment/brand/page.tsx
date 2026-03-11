"use client";

import { useEffect, useState } from "react";
import { Palette, ChevronDown, Printer, Smartphone, LayoutDashboard } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

type BrandGroup = "print" | "pay" | "cabinet";

const BRAND_GROUPS: { value: BrandGroup; label: string; description: string; icon: typeof Printer }[] = [
  { value: "print", label: "QR-карточка для печати", description: "Фиксированная карточка: лого, рамка, QR. Без суммы и полей ввода.", icon: Printer },
  { value: "pay", label: "Страница оплаты (клиент)", description: "Что видит клиент при переходе по QR: суммы, кнопка оплаты.", icon: Smartphone },
  { value: "cabinet", label: "Личный кабинет официанта", description: "Оформление раздела заведения и кабинета официанта.", icon: LayoutDashboard },
];

interface BrandSettings {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  mainBackgroundColor: string | null;
  mainBackgroundOpacityPercent: number | null;
  blocksBackgroundColor: string | null;
  blocksBackgroundOpacityPercent: number | null;
  secondaryOpacityPercent: number | null;
  fontColor: string | null;
  borderColor: string | null;
  borderWidthPx: number | null;
  borderOpacityPercent: number | null;
  printCardWidthMm: number | null;
  printCardHeightMm: number | null;
}

const DEFAULT_HEX = { primary: "#c9a227", secondary: "#0a192f", mainBg: "#0a192f", blocksBg: "#1e293b", font: "#fafafa", border: "rgba(197,165,114,0.5)" };

export default function EstablishmentBrandPage() {
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [mainBackgroundColor, setMainBackgroundColor] = useState("");
  const [blocksBackgroundColor, setBlocksBackgroundColor] = useState("");
  const [fontColor, setFontColor] = useState("");
  const [borderColor, setBorderColor] = useState("");
  const [borderWidthPx, setBorderWidthPx] = useState(2);
  const [borderOpacityPercent, setBorderOpacityPercent] = useState(100);
  const [mainBackgroundOpacityPercent, setMainBackgroundOpacityPercent] = useState(100);
  const [blocksBackgroundOpacityPercent, setBlocksBackgroundOpacityPercent] = useState(100);
  const [secondaryOpacityPercent, setSecondaryOpacityPercent] = useState(100);
  const [printCardWidthMm, setPrintCardWidthMm] = useState(67);
  const [printCardHeightMm, setPrintCardHeightMm] = useState(49);
  const [message, setMessage] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<BrandGroup>("pay");

  const clampPercent = (v: number) => Math.min(100, Math.max(0, v));
  const clampMm = (v: number) => Math.min(200, Math.max(20, v));
  const hexRe = /^#[0-9A-Fa-f]{6}$/i;
  const hex = (s: string | undefined) => (s && hexRe.test(s) ? s : "");
  const hexOr = (s: string | undefined, fallback: string) => hex(s) || fallback;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/establishment/settings", {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setLogoUrl(data.logoUrl ?? "");
          setPrimaryColor(data.primaryColor ?? "");
          setSecondaryColor(data.secondaryColor ?? "");
          setMainBackgroundColor(data.mainBackgroundColor ?? "");
          setBlocksBackgroundColor(data.blocksBackgroundColor ?? "");
          setFontColor(data.fontColor ?? "");
          setBorderColor(data.borderColor ?? "");
          setBorderWidthPx(data.borderWidthPx ?? 2);
          setBorderOpacityPercent(data.borderOpacityPercent ?? 100);
          setMainBackgroundOpacityPercent(data.mainBackgroundOpacityPercent ?? 100);
          setBlocksBackgroundOpacityPercent(data.blocksBackgroundOpacityPercent ?? 100);
          setSecondaryOpacityPercent(data.secondaryOpacityPercent ?? 100);
          setPrintCardWidthMm(data.printCardWidthMm ?? 67);
          setPrintCardHeightMm(data.printCardHeightMm ?? 49);
        }
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
          mainBackgroundOpacityPercent: mainBackgroundOpacityPercent,
          blocksBackgroundColor: blocksBackgroundColor.trim() || null,
          blocksBackgroundOpacityPercent: blocksBackgroundOpacityPercent,
          secondaryOpacityPercent: secondaryOpacityPercent,
          fontColor: fontColor.trim() || null,
          borderColor: borderColor.trim() || null,
          borderWidthPx: borderWidthPx,
          borderOpacityPercent: borderOpacityPercent,
          printCardWidthMm: printCardWidthMm,
          printCardHeightMm: printCardHeightMm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error ?? "Ошибка сохранения");
        setSaving(false);
        return;
      }
      setSettings(data);
      setLogoUrl(data.logoUrl ?? "");
      setPrimaryColor(data.primaryColor ?? "");
      setSecondaryColor(data.secondaryColor ?? "");
      setMainBackgroundColor(data.mainBackgroundColor ?? "");
      setBlocksBackgroundColor(data.blocksBackgroundColor ?? "");
      setFontColor(data.fontColor ?? "");
      setBorderColor(data.borderColor ?? "");
      setBorderWidthPx(data.borderWidthPx ?? 2);
      setBorderOpacityPercent(data.borderOpacityPercent ?? 100);
      setMainBackgroundOpacityPercent(data.mainBackgroundOpacityPercent ?? 100);
      setBlocksBackgroundOpacityPercent(data.blocksBackgroundOpacityPercent ?? 100);
      setSecondaryOpacityPercent(data.secondaryOpacityPercent ?? 100);
      setPrintCardWidthMm(data.printCardWidthMm ?? 67);
      setPrintCardHeightMm(data.printCardHeightMm ?? 49);
      setMessage("Сохранено. Настройки применяются в личном кабинете и на странице оплаты чаевых. QR настраивается в разделе «QR и печать».");
    } catch {
      setMessage("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm("Вернуть все настройки бренда к исходным? Лого и цвета будут сброшены.")) return;
    setMessage(null);
    setResetting(true);
    try {
      const res = await fetch("/api/establishment/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ resetToDefaults: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error ?? "Ошибка сброса");
        setResetting(false);
        return;
      }
      setSettings(data);
      setLogoUrl(data.logoUrl ?? "");
      setPrimaryColor(data.primaryColor ?? "");
      setSecondaryColor(data.secondaryColor ?? "");
      setMainBackgroundColor(data.mainBackgroundColor ?? "");
      setBlocksBackgroundColor(data.blocksBackgroundColor ?? "");
      setFontColor(data.fontColor ?? "");
      setBorderColor(data.borderColor ?? "");
      setBorderWidthPx(data.borderWidthPx ?? 2);
      setBorderOpacityPercent(data.borderOpacityPercent ?? 100);
      setMainBackgroundOpacityPercent(data.mainBackgroundOpacityPercent ?? 100);
      setBlocksBackgroundOpacityPercent(data.blocksBackgroundOpacityPercent ?? 100);
      setSecondaryOpacityPercent(data.secondaryOpacityPercent ?? 100);
      setPrintCardWidthMm(data.printCardWidthMm ?? 67);
      setPrintCardHeightMm(data.printCardHeightMm ?? 49);
      setMessage("Настройки сброшены к исходным.");
    } catch {
      setMessage("Ошибка соединения");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <div className="text-white/90">Загрузка…</div>;
  }

  const hexToRgba = (hex: string | undefined, percent: number) => {
    if (!hex || !/^#[0-9A-Fa-f]{6}$/i.test(hex)) return undefined;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${percent / 100})`;
  };
  const borderHex = hexOr(borderColor, hexOr(primaryColor, "#c5a572"));
  const borderRgba = (() => {
    const r = parseInt(borderHex.slice(1, 3), 16);
    const g = parseInt(borderHex.slice(3, 5), 16);
    const b = parseInt(borderHex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${borderOpacityPercent / 100})`;
  })();
  const borderWidth = Math.min(8, Math.max(0, borderWidthPx));
  const mainBgRgba = hexToRgba(mainBackgroundColor || undefined, mainBackgroundOpacityPercent);
  const blocksBgRgba = hexToRgba(blocksBackgroundColor || undefined, blocksBackgroundOpacityPercent);
  const secondaryRgba = hexToRgba(secondaryColor || undefined, secondaryOpacityPercent);

  const isPrintOnly = activeGroup === "print";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white flex items-center justify-center gap-2 w-full">
          <Palette className="h-5 w-5" />
          Бренд заведения
        </h1>
        <p className="text-white/90 text-sm mt-1 text-center">
          Выберите, что настраиваете: карточка для печати, страница оплаты или кабинет. Общая палитра одна — превью покажет, как это будет выглядеть.
        </p>
      </div>

      {/* Выбор группы: выпадающий список */}
      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] p-4">
        <label className="block text-sm font-medium text-white/90 mb-2">Режим настройки</label>
        <div className="relative">
          <select
            value={activeGroup}
            onChange={(e) => setActiveGroup(e.target.value as BrandGroup)}
            className="cabinet-input-window w-full appearance-none rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 pl-4 pr-10 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40 cursor-pointer"
          >
            {BRAND_GROUPS.map((g) => (
              <option key={g.value} value={g.value} className="bg-[#1e293b] text-white">
                {g.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60 pointer-events-none" />
        </div>
        <p className="mt-2 text-xs text-white/70">
          {BRAND_GROUPS.find((g) => g.value === activeGroup)?.description}
        </p>
      </div>

      {/* Две колонки: слева — настройки, справа — превью */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Левая колонка: форма настроек */}
        <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden order-2 lg:order-1">
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
              <label className="block text-sm text-white/90 mb-1">Основной цвет (hex){isPrintOnly ? " — рамка, акцент на карточке" : " — кнопки, акценты, рамки"}</label>
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
            {!isPrintOnly && (
            <>
            <div>
              <label className="block text-sm text-white/90 mb-1">Доп. цвет (hex) — фон карточки оплаты, сайдбар</label>
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
              <div className="mt-2">
                <label className="block text-xs text-white/70 mb-1">Прозрачность доп. цвета, %</label>
                <div className="flex gap-2 items-center">
                  <input type="range" min={0} max={100} value={secondaryOpacityPercent} onChange={(e) => setSecondaryOpacityPercent(Number(e.target.value))} className="flex-1 h-2 rounded-lg appearance-none bg-white/20 accent-[var(--color-brand-gold)]" />
                  <input type="number" min={0} max={100} value={secondaryOpacityPercent} onChange={(e) => setSecondaryOpacityPercent(clampPercent(Number(e.target.value)))} className="cabinet-input-window w-14 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2 py-1.5 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Фон основной (hex) — фон страницы</label>
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
              <div className="mt-2">
                <label className="block text-xs text-white/70 mb-1">Прозрачность фона основной, %</label>
                <div className="flex gap-2 items-center">
                  <input type="range" min={0} max={100} value={mainBackgroundOpacityPercent} onChange={(e) => setMainBackgroundOpacityPercent(Number(e.target.value))} className="flex-1 h-2 rounded-lg appearance-none bg-white/20 accent-[var(--color-brand-gold)]" />
                  <input type="number" min={0} max={100} value={mainBackgroundOpacityPercent} onChange={(e) => setMainBackgroundOpacityPercent(clampPercent(Number(e.target.value)))} className="cabinet-input-window w-14 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2 py-1.5 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Фон блоков (hex) — карточки, поля</label>
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
              <div className="mt-2">
                <label className="block text-xs text-white/70 mb-1">Прозрачность фона блоков, %</label>
                <div className="flex gap-2 items-center">
                  <input type="range" min={0} max={100} value={blocksBackgroundOpacityPercent} onChange={(e) => setBlocksBackgroundOpacityPercent(Number(e.target.value))} className="flex-1 h-2 rounded-lg appearance-none bg-white/20 accent-[var(--color-brand-gold)]" />
                  <input type="number" min={0} max={100} value={blocksBackgroundOpacityPercent} onChange={(e) => setBlocksBackgroundOpacityPercent(clampPercent(Number(e.target.value)))} className="cabinet-input-window w-14 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2 py-1.5 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/90 mb-1">Цвет шрифта (hex)</label>
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
            </>
            )}
            <div>
              <label className="block text-sm text-white/90 mb-1">Цвет обводки (hex){isPrintOnly ? " — рамка карточки" : " — рамки карточек и полей"}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={borderColor.match(/^#[0-9A-Fa-f]{6}$/) ? borderColor : "#c5a372"}
                  onChange={(e) => setBorderColor(e.target.value)}
                  className="h-10 w-14 rounded border border-[var(--color-brand-gold)]/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  placeholder="#c5a372"
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
              <label className="block text-sm text-white/90 mb-1">Прозрачность обводки, %</label>
              <div className="flex gap-2 items-center">
                <input type="range" min={0} max={100} value={borderOpacityPercent} onChange={(e) => setBorderOpacityPercent(Number(e.target.value))} className="flex-1 h-2 rounded-lg appearance-none bg-white/20 accent-[var(--color-brand-gold)]" />
                <input type="number" min={0} max={100} value={borderOpacityPercent} onChange={(e) => setBorderOpacityPercent(clampPercent(Number(e.target.value)))} className="cabinet-input-window w-14 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-2 py-1.5 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40" />
              </div>
            </div>
            {isPrintOnly && (
              <div className="rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/5 p-3 space-y-3">
                <p className="text-sm font-medium text-white/90">Размер карточки для печати (мм)</p>
                <p className="text-xs text-white/70">Ширина и высота одной карточки в PDF. Контент масштабируется под выбранный размер.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Ширина, мм</label>
                    <input type="number" min={20} max={200} value={printCardWidthMm} onChange={(e) => setPrintCardWidthMm(clampMm(Number(e.target.value)))} className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Высота, мм</label>
                    <input type="number" min={20} max={200} value={printCardHeightMm} onChange={(e) => setPrintCardHeightMm(clampMm(Number(e.target.value)))} className="cabinet-input-window w-full rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40" />
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                disabled={resetting || saving}
                className="rounded-[10px] border border-white/30 bg-white/5 px-4 py-2 font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
              >
                {resetting ? "Сброс…" : "Вернуть к исходным настройкам"}
              </button>
            </div>
          </form>
        </div>

        {/* Правая колонка: превью по выбранной группе */}
        <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden order-1 lg:order-2 lg:sticky lg:top-4">
          <div className="border-b border-white/10 px-4 py-3 text-center">
            <span className="text-sm font-medium text-white/90">
              {activeGroup === "print" && "Превью: карточка для печати (фиксированная)"}
              {activeGroup === "pay" && "Превью: страница оплаты (клиент)"}
              {activeGroup === "cabinet" && "Превью: личный кабинет официанта"}
            </span>
          </div>
          <div
            className="p-6 flex flex-col items-center gap-4 rounded-b-[10px] max-h-[70vh] overflow-y-auto"
            style={{
              backgroundColor: mainBgRgba ?? (hex(mainBackgroundColor) || undefined),
            }}
          >
            {/* Превью: карточка для печати — размер по настройкам (мм → px для экрана), контент тянется */}
            {activeGroup === "print" && (
              <div className="w-full flex flex-col items-center">
                <p className="text-xs text-white/60 mb-2">Так будет выглядеть одна карточка в PDF ({printCardWidthMm}×{printCardHeightMm} мм)</p>
                <div
                  className="transition-colors flex flex-col overflow-hidden max-w-full"
                  style={{
                    width: Math.round(printCardWidthMm * 3.6),
                    height: Math.round(printCardHeightMm * 3.6),
                    minWidth: 120,
                    minHeight: 90,
                    border: `${Math.min(2, borderWidth)}px solid ${borderRgba}`,
                    borderRadius: 4,
                    backgroundColor: mainBgRgba ?? hexOr(mainBackgroundColor, "#0a192f"),
                  }}
                >
                  {/* Верх: лого или название */}
                  <div className="flex items-center justify-center shrink-0 py-2 px-2 min-h-[36px]" style={{ borderBottom: `1px solid ${borderRgba}` }}>
                    {logoUrl.trim() ? (
                      <img src={logoUrl.trim()} alt="" className="h-6 w-auto max-w-[140px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="font-[family:var(--font-playfair)] text-sm font-bold truncate max-w-full" style={{ color: hexOr(fontColor, "#fafafa") }}>
                        Free<span style={{ color: hexOr(primaryColor, "var(--color-brand-gold)") }}>Tips</span>
                      </span>
                    )}
                  </div>
                  {/* Блок: имя слева, QR справа (как в PDF) */}
                  <div
                    className="flex-1 flex items-center justify-between gap-2 px-3 py-2 mt-2 mx-2 rounded"
                    style={{
                      backgroundColor: blocksBgRgba ?? hexOr(blocksBackgroundColor, "rgba(0.06,0.12,0.22,1)"),
                      border: `1px solid ${borderRgba}`,
                    }}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: hexOr(fontColor, "#fafafa") }}>Имя официанта</p>
                      <p className="text-xs opacity-90" style={{ color: hexOr(fontColor, "#e2e8f0") }}>Должность</p>
                    </div>
                    <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center bg-white/10 text-[10px] text-white/70" aria-hidden>QR</div>
                  </div>
                  <p className="text-[10px] px-3 py-1.5 text-center" style={{ color: hexOr(fontColor, "rgba(250,250,250,0.8)") }}>Отсканируйте для чаевых</p>
                </div>
              </div>
            )}

            {/* Превью: страница оплаты (клиент) — полный макет как при сканировании QR */}
            {activeGroup === "pay" && (
              <div className="w-full max-w-[380px] mx-auto">
                <p className="text-xs text-white/60 mb-2">Так видит страницу клиент после перехода по QR</p>
                <div className="rounded-2xl overflow-hidden border-0 shadow-lg transition-colors" style={{ backgroundColor: secondaryRgba ?? hexOr(secondaryColor, blocksBgRgba ?? "#1e293b"), borderWidth: borderWidth ? `${borderWidth}px` : 0, borderStyle: "solid", borderColor: borderRgba }}>
                  <div className="px-4 pt-4 pb-4 space-y-3">
                    {/* Логотип */}
                    <div className="flex justify-center">
                      <div className="flex items-center gap-2">
                        {logoUrl.trim() ? (
                          <img src={logoUrl.trim()} alt="" className="h-9 w-auto max-w-[110px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-[#0a192f]" style={{ backgroundColor: hexOr(primaryColor, "var(--color-brand-gold)") }}>FT</span>
                        )}
                        <span className="font-[family:var(--font-playfair)] text-base font-bold" style={{ color: hexOr(fontColor, "#fafafa") }}>
                          <span className="opacity-90">Free</span>
                          <span style={{ color: hexOr(primaryColor, "var(--color-brand-gold)") }}>Tips</span>
                        </span>
                      </div>
                    </div>
                    {/* Карточка получателя: имя + QR */}
                    <div className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ borderWidth: `${Math.min(2, borderWidth)}px`, borderStyle: "solid", borderColor: borderRgba, backgroundColor: blocksBgRgba ?? "rgba(255,255,255,0.06)" }}>
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-sm" style={{ backgroundColor: (hex(primaryColor) || "var(--color-brand-gold)") + "26", color: hexOr(primaryColor, "var(--color-brand-gold)") }}>👤</div>
                        <div>
                          <p className="font-medium text-sm truncate" style={{ color: hexOr(fontColor, "#fafafa") }}>Имя официанта</p>
                          <p className="text-xs opacity-80" style={{ color: hexOr(fontColor, "#e2e8f0") }}>Коплю на: цель</p>
                        </div>
                      </div>
                      <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0 bg-black/20 text-[10px] text-white/70">QR</div>
                    </div>
                    {/* Суммы */}
                    <div className="rounded-xl p-3" style={{ borderWidth: `${Math.min(2, borderWidth)}px`, borderStyle: "solid", borderColor: borderRgba, backgroundColor: blocksBgRgba ?? "rgba(255,255,255,0.06)" }}>
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {[50, 100, 200, 500].map((r, i) => (
                          <div key={r} className="rounded-lg py-2 text-center text-xs font-medium" style={{ backgroundColor: i === 1 ? (hex(primaryColor) ? `${hex(primaryColor)}33` : "rgba(201,162,39,0.2)") : "rgba(255,255,255,0.08)", color: hexOr(fontColor, "#fafafa") }}>{r} ₽</div>
                        ))}
                      </div>
                      <p className="text-[10px] mb-1.5 opacity-80" style={{ color: hexOr(fontColor, "#94a3b8") }}>Выберите сумму или введите свою</p>
                      <div className="rounded-lg h-8 px-2 bg-white/5 border border-white/10" style={{ color: hexOr(fontColor, "#f1f5f9") }} />
                    </div>
                    {/* Отзыв */}
                    <div className="rounded-xl p-2.5" style={{ borderWidth: `${Math.min(2, borderWidth)}px`, borderStyle: "solid", borderColor: borderRgba, backgroundColor: blocksBgRgba ?? "rgba(255,255,255,0.06)" }}>
                      <p className="text-[10px] font-medium mb-1" style={{ color: hexOr(fontColor, "#cbd5e1") }}>Отзыв (необязательно)</p>
                      <div className="rounded h-12 bg-white/5 border border-white/10" />
                    </div>
                    {/* Кнопка оплаты */}
                    <button type="button" disabled className="w-full rounded-xl py-2.5 text-sm font-semibold text-[#0a192f]" style={{ backgroundColor: hexOr(primaryColor, "var(--color-brand-gold)") }}>
                      Оплатить 100 ₽
                    </button>
                    {/* Подсказки */}
                    <div className="flex flex-col gap-1 pt-1">
                      <p className="text-[10px] opacity-70 flex items-center gap-1.5" style={{ color: hexOr(fontColor, "#94a3b8") }}><span>📱</span> Покажите QR — гость отсканирует эту страницу</p>
                      <p className="text-[10px] opacity-70 flex items-center gap-1.5" style={{ color: hexOr(fontColor, "#94a3b8") }}><span>💳</span> Оплата картой. Регистрация не нужна.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Превью: личный кабинет официанта */}
            {activeGroup === "cabinet" && (
              <div className="w-full max-w-sm flex rounded-[10px] overflow-hidden border border-white/10" style={{ backgroundColor: mainBgRgba ?? hexOr(mainBackgroundColor, "#0f172a") }}>
                <div className="w-14 shrink-0 py-3 px-2 border-r border-white/10" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <div className="h-2 w-2 rounded-full mb-2 mx-1" style={{ backgroundColor: hexOr(primaryColor, "var(--color-brand-gold)") }} />
                  <div className="h-2 w-2 rounded-full mb-2 mx-1 bg-white/20" />
                  <div className="h-2 w-2 rounded-full mx-1 bg-white/20" />
                </div>
                <div className="flex-1 p-3 min-w-0">
                  <div className="rounded-lg border border-white/10 p-2 mb-2" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-xs text-white/80">Контент кабинета</span>
                  </div>
                  <p className="text-xs text-white/60">Сайдбар и основной блок в стиле бренда</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
