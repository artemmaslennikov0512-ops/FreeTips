"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

interface BrandSettings {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export default function EstablishmentBrandPage() {
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error ?? "Ошибка сохранения");
        setSaving(false);
        return;
      }
      setSettings(data);
      setMessage("Сохранено. Лого и цвета будут отображаться на странице приёма чаевых по QR сотрудников.");
    } catch {
      setMessage("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-white/90">Загрузка…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-white flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Бренд заведения
        </h1>
        <p className="text-white/90 text-sm mt-1">
          Логотип и цвета отображаются на странице оплаты чаевых и в кабинете официанта. Меняйте поля — превью обновится сразу.
        </p>
      </div>

      {/* Превью в реальном времени */}
      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <span className="text-sm font-medium text-white/90">Превью: как увидят гости и официанты</span>
        </div>
        <div
          className="p-6 flex flex-col items-center gap-4"
          style={
            (primaryColor && /^#[0-9A-Fa-f]{6}$/i.test(primaryColor)) || (secondaryColor && /^#[0-9A-Fa-f]{6}$/i.test(secondaryColor))
              ? {
                  ["--preview-primary" as string]: primaryColor && /^#[0-9A-Fa-f]{6}$/i.test(primaryColor) ? primaryColor : "#c9a227",
                  ["--preview-secondary" as string]: secondaryColor && /^#[0-9A-Fa-f]{6}$/i.test(secondaryColor) ? secondaryColor : "#0a192f",
                }
              : undefined
          }
        >
          <div
            className="w-full max-w-sm rounded-xl border-2 border-[var(--preview-primary,var(--color-brand-gold))]/60 bg-[var(--color-dark-gray)]/20 p-4"
            style={
              primaryColor && /^#[0-9A-Fa-f]{6}$/i.test(primaryColor)
                ? { ["--preview-primary" as string]: primaryColor }
                : undefined
            }
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
              <span className="font-[family:var(--font-playfair)] text-lg font-bold text-white">
                <span className="text-white/80">{logoUrl.trim() ? "" : "Free"}</span>
                <span className="text-[var(--preview-primary,var(--color-brand-gold))]">Tips</span>
              </span>
            </div>
            <div className="rounded-lg border border-[var(--preview-primary,var(--color-brand-gold))]/40 bg-white/5 py-2 px-3 text-center text-sm text-white/90">
              Имя официанта
            </div>
            <div className="flex gap-2 mt-3">
              <span className="flex-1 rounded-lg bg-white/10 py-1.5 text-center text-xs text-white/70">50 ₽</span>
              <span className="flex-1 rounded-lg bg-[var(--preview-primary,var(--color-brand-gold))]/20 py-1.5 text-center text-xs text-white">100 ₽</span>
            </div>
            <button
              type="button"
              disabled
              className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-[#0a192f]"
              style={{ backgroundColor: "var(--preview-primary, var(--color-brand-gold))" }}
            >
              Оплатить 100 ₽
            </button>
          </div>
          <p className="text-xs text-white/60 text-center">
            Страница оплаты по QR · кнопки и акценты в кабинете официанта
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
            <label className="block text-sm text-white/90 mb-1">Основной цвет (hex)</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={primaryColor.match(/^#[0-9A-Fa-f]{6}$/) ? primaryColor : "#c9a227"}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 rounded border border-[var(--color-brand-gold)]/20 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#c9a227"
                className="cabinet-input-window flex-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/90 mb-1">Доп. цвет (hex)</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={secondaryColor.match(/^#[0-9A-Fa-f]{6}$/) ? secondaryColor : "#0a192f"}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-14 rounded border border-[var(--color-brand-gold)]/20 cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#0a192f"
                className="cabinet-input-window flex-1 rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]/40"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </form>
      </div>
    </div>
  );
}
