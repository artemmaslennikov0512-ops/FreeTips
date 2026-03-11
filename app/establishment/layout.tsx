"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, Users, PieChart, BarChart3, Palette, Menu, QrCode } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Profile {
  role: string;
  establishmentId?: string | null;
  mustChangePassword?: boolean;
}

const NAV = [
  { label: "Дашборд", href: "/establishment" },
  { label: "Команда", href: "/establishment/team" },
  { label: "QR и печать", href: "/establishment/qr" },
  { label: "Распределение", href: "/establishment/payout-rules" },
  { label: "Аналитика", href: "/establishment/analytics" },
  { label: "Бренд", href: "/establishment/brand" },
] as const;

export default function EstablishmentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-white">
        <p className="text-center text-white/90">{loadError}</p>
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

  const isActive = (href: string) => pathname === href || (href !== "/establishment" && pathname.startsWith(href));
  const navIcons = [LayoutDashboard, Users, QrCode, PieChart, BarChart3, Palette] as const;
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="establishment-panel cabinet-premium flex min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-[var(--color-bg)] font-[family:var(--font-inter)] text-white pt-4">
      {/* Шторка на мобильном */}
      <div
        className={`cabinet-overlay fixed inset-0 z-30 bg-[rgba(15,23,42,0.65)] backdrop-blur-xl transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden
      />

      {/* Сайдбар: на мобильном — выезжает слева, на lg — статичный */}
      <aside
        className={`cabinet-sidebar fixed left-0 top-0 z-40 flex h-full w-[min(calc(100vw-4rem),20rem)] max-w-[20rem] flex-col overflow-hidden border-0 border-r border-white/10 py-6 shadow-2xl backdrop-blur-xl transition-[transform] duration-300 ease-out lg:static lg:left-auto lg:top-auto lg:ml-4 lg:mt-4 lg:mr-0 lg:mb-0 lg:h-auto lg:max-h-[calc(100vh-2rem)] lg:w-[260px] lg:max-w-none lg:translate-x-0 lg:rounded-2xl lg:border bg-white/[0.06] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 mb-6">
          <span className="font-[family:var(--font-playfair)] font-bold text-white">
            Кабинет заведения
          </span>
        </div>
        <nav className="mt-2 flex flex-1 flex-col gap-1 px-4">
          {NAV.map(({ label, href }, i) => {
            const Icon = navIcons[i];
            return (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-[10px] px-4 py-3.5 font-medium transition-colors ${
                  isActive(href)
                    ? "cabinet-nav-active border border-[#0a192f]/35 bg-[#0a192f]/12 text-[#0a192f] font-semibold"
                    : "border border-transparent text-white/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 break-words">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/cabinet"
            onClick={closeSidebar}
            className="mt-2 flex items-center gap-3 rounded-[10px] px-4 py-3.5 font-medium text-white/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-white"
          >
            Личный кабинет
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Выйти</span>
          </button>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden pl-4 pr-4 lg:pl-0 lg:pr-0 lg:ml-0 flex flex-col">
        <div className="cabinet-main-block mt-4 mr-0 mb-4 ml-0 lg:mr-4 lg:ml-4 flex flex-col rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <div className="p-6 lg:p-8" id="main-content">
            <div className="mb-4 lg:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-14 w-14 min-w-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-[var(--color-brand-gold)] hover:bg-[var(--color-brand-gold)]/20 hover:border-[var(--color-brand-gold)]/40 active:scale-95"
                aria-label="Меню"
              >
                <Menu className="h-7 w-7" strokeWidth={2} />
              </button>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
