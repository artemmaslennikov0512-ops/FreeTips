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
    return <div className="text-[var(--color-text-secondary)]">Загрузка…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)] flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Бренд заведения
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1">
          Логотип и цвета отображаются на странице оплаты чаевых (по QR сотрудников).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-[var(--color-navy)] p-6 space-y-4"
      >
        {message && (
          <p className={`text-sm ${message.startsWith("Сохранено") ? "text-green-300" : "text-red-300"}`}>
            {message}
          </p>
        )}
        <div>
          <label className="block text-sm text-white/80 mb-1">URL логотипа</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-white/80 mb-1">Основной цвет (hex)</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={primaryColor.match(/^#[0-9A-Fa-f]{6}$/) ? primaryColor : "#c9a227"}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 rounded border border-white/20 cursor-pointer"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#c9a227"
              className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-white/80 mb-1">Доп. цвет (hex)</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={secondaryColor.match(/^#[0-9A-Fa-f]{6}$/) ? secondaryColor : "#0a192f"}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-10 w-14 rounded border border-white/20 cursor-pointer"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#0a192f"
              className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[var(--color-brand-gold)] px-4 py-2 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
