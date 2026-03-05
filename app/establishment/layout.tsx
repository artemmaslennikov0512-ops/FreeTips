"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, Users, PieChart, BarChart3, Palette } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Profile {
  role: string;
  establishmentId?: string | null;
  mustChangePassword?: boolean;
}

export default function EstablishmentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.classList.add("cabinet-page", "establishment-page");
    return () => document.body.classList.remove("cabinet-page", "establishment-page");
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("accessToken");
          router.replace("/login");
          return;
        }

        if (!res.ok) {
          setLoadError("Не удалось загрузить данные. Нажмите «Повторить».");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setProfile(data);

        if (data.role !== "ESTABLISHMENT_ADMIN" || !data.establishmentId) {
          router.replace("/cabinet");
          return;
        }

        if (data.mustChangePassword) {
          router.replace("/change-password");
          return;
        }
      } catch {
        setLoadError("Ошибка соединения. Нажмите «Повторить».");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [mounted, retryTrigger, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: "{}",
        credentials: "include",
      });
    } finally {
      localStorage.removeItem("accessToken");
      router.replace("/");
    }
  };

  if (!mounted || loading) {
    return <LoadingSpinner message="Загрузка…" className="min-h-[60vh]" />;
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-[var(--color-text)]">
        <p className="text-center text-[var(--color-text-secondary)]">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            setLoading(true);
            setRetryTrigger((t) => t + 1);
          }}
          className="rounded-xl bg-[var(--color-brand-gold)] px-6 py-2.5 font-medium text-[#0a192f] hover:opacity-90"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!profile || profile.role !== "ESTABLISHMENT_ADMIN") {
    return null;
  }

  return (
    <div className="establishment-panel cabinet-premium flex min-h-screen w-full min-w-0 max-w-full bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-4">
      <aside className="fixed left-4 top-4 z-40 flex w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a192f] py-6 lg:static lg:ml-4 lg:mt-4">
        <div className="px-4 mb-6">
          <span className="font-[family:var(--font-playfair)] font-bold text-white">
            Кабинет заведения
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          <Link
            href="/establishment"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white"
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span>Дашборд</span>
          </Link>
          <Link
            href="/establishment/team"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white"
          >
            <Users className="h-5 w-5 shrink-0" />
            <span>Команда</span>
          </Link>
          <Link
            href="/establishment/payout-rules"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white"
          >
            <PieChart className="h-5 w-5 shrink-0" />
            <span>Распределение</span>
          </Link>
          <Link
            href="/establishment/analytics"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white"
          >
            <BarChart3 className="h-5 w-5 shrink-0" />
            <span>Аналитика</span>
          </Link>
          <Link
            href="/establishment/brand"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white"
          >
            <Palette className="h-5 w-5 shrink-0" />
            <span>Бренд</span>
          </Link>
        </nav>
        <div className="mt-auto border-t border-white/10 px-2 pt-4">
          <Link
            href="/cabinet"
            className="mb-2 flex items-center gap-3 rounded-xl px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white"
          >
            Личный кабинет
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
