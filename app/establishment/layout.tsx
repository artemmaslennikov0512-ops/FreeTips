"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, Users, PieChart, BarChart3, Palette } from "lucide-react";
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

  const isActive = (href: string) => pathname === href || (href !== "/establishment" && pathname.startsWith(href));
  const navIcons = [LayoutDashboard, Users, PieChart, BarChart3, Palette] as const;

  return (
    <div className="establishment-panel cabinet-premium flex min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-4">
      <aside className="cabinet-sidebar fixed left-4 top-4 z-40 flex h-auto max-h-[calc(100vh-2rem)] w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] py-6 shadow-sm backdrop-blur-xl lg:static lg:ml-4 lg:mt-4 lg:max-h-none lg:self-start">
        <div className="px-4 mb-6">
          <span className="font-[family:var(--font-playfair)] font-bold text-[var(--color-text)]">
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
                className={`flex items-center gap-3 rounded-[10px] px-4 py-3.5 font-medium transition-colors ${
                  isActive(href)
                    ? "cabinet-nav-active border border-[#0a192f]/35 bg-[#0a192f]/12 text-[#0a192f] font-semibold"
                    : "border border-transparent text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
          <Link
            href="/cabinet"
            className="mt-2 flex items-center gap-3 rounded-[10px] px-4 py-3.5 font-medium text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
          >
            Личный кабинет
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-[10px] px-4 py-3.5 font-medium text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Выйти</span>
          </button>
        </nav>
      </aside>
      <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden lg:ml-0 flex flex-col">
        <div className="cabinet-main-block mt-4 mr-0 mb-4 ml-4 lg:mr-4 lg:ml-4 flex min-h-[calc(100vh-2rem)] flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
