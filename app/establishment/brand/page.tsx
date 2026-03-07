"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

interface BrandSettings {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  mainBackgroundColor: string | null;
  blocksBackgroundColor: string | null;
  fontColor: string | null;
  borderColor: string | null;
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
  const [message, setMessage] = useState<string | null>(null);

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
          blocksBackgroundColor: blocksBackgroundColor.trim() || null,
          fontColor: fontColor.trim() || null,
          borderColor: borderColor.trim() || null,
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
      setMessage("Сохранено. Настройки применятся на странице оплаты по QR и в кабинете официанта.");
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white flex items-center justify-center gap-2 w-full">
          <Palette className="h-5 w-5" />
          Бренд заведения
        </h1>
        <p className="text-white/90 text-sm mt-1">
          Логотип и цвета отображаются на странице оплаты чаевых и в кабинете официанта. Меняйте поля — превью обновится сразу.
        </p>
      </div>

      {/* Превью в реальном времени: основной фон, доп. цвет = фон блока, фон блоков, цвет текста */}
      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <span className="text-sm font-medium text-white/90">Превью: как увидят гости и официанты</span>
        </div>
        <div
          className="p-6 flex flex-col items-center gap-4 rounded-b-[10px]"
          style={{
            backgroundColor: mainBackgroundColor && /^#[0-9A-Fa-f]{6}$/i.test(mainBackgroundColor) ? mainBackgroundColor : undefined,
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border-2 p-4 transition-colors"
            style={{
              borderColor: borderColor && /^#[0-9A-Fa-f]{6}$/i.test(borderColor) ? borderColor : primaryColor && /^#[0-9A-Fa-f]{6}$/i.test(primaryColor) ? `${primaryColor}99` : undefined,
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
              className="rounded-lg border py-2 px-3 text-center text-sm"
              style={{
                borderColor: borderColor && /^#[0-9A-Fa-f]{6}$/i.test(borderColor) ? borderColor : primaryColor && /^#[0-9A-Fa-f]{6}$/i.test(primaryColor) ? `${primaryColor}66` : undefined,
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
          <p className="text-xs text-center opacity-70" style={{ color: fontColor && /^#[0-9A-Fa-f]{6}$/i.test(fontColor) ? fontColor : undefined }}>
            Основной фон · Доп. цвет = фон карточки · Фон блоков · Цвет текста · Обводка
          </p>
        </div>
      </div>

      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
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
            <label className="block text-sm text-white/90 mb-1">Основной цвет (hex) — кнопки, акценты, рамки</label>
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
          <div>
            <label className="block text-sm text-white/90 mb-1">Цвет обводки (hex) — рамки карточек и полей</label>
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
    </div>
  );
}
