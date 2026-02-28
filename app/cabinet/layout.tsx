"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  List,
  Link2,
  Settings,
  Menu,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const NAV = [
  { label: "Дашборд", href: "/cabinet", icon: LayoutDashboard },
  { label: "Операции", href: "/cabinet/transactions", icon: List },
  { label: "Моя ссылка", href: "/cabinet/link", icon: Link2 },
  { label: "Поддержка", href: "/cabinet/support", icon: MessageCircle },
  { label: "Настройки профиля", href: "/cabinet/settings", icon: Settings },
] as const;

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ fullName?: string | null } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.classList.add("cabinet-page");
    return () => document.body.classList.remove("cabinet-page");
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("accessToken");
          router.replace("/login");
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data?.role === "ADMIN" || data?.role === "SUPERADMIN") {
          router.replace("/admin/dashboard");
          return;
        }
        if (data?.mustChangePassword) {
          router.replace("/change-password");
          return;
        }
        if (data) setUser({ fullName: data.fullName });
      })
      .catch(() => {});
  }, [mounted, router]);

  const handleLogout = useCallback(async () => {
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
  }, [router]);

  const isActive = (href: string) =>
    href === "/cabinet" ? pathname === "/cabinet" : pathname.startsWith(href);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (!mounted) {
    return <LoadingSpinner message="Загрузка…" className="min-h-[60vh]" />;
  }

  const displayName = user?.fullName?.trim() || "Пользователь";
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="cabinet-premium flex min-h-screen w-full bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-4">
      {/* Шторка — стиль как на блоке: тёмное стекло, размытие, тонкая светлая обводка */}
      <div
        className={`cabinet-overlay fixed inset-0 z-30 rounded-xl border border-white/[0.12] bg-[rgba(15,23,42,0.65)] backdrop-blur-xl lg:hidden ml-4 mr-4 mt-4 mb-4 ${sidebarOpen ? "block" : "hidden"}`}
        onClick={closeSidebar}
        aria-hidden
      />

      {/* Левое меню — как шторка: отступы от краёв */}
      <div
        className={`cabinet-sidebar fixed left-4 top-4 z-40 flex h-auto max-h-[calc(100vh-2rem)] w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] py-6 shadow-sm backdrop-blur-xl transition-transform duration-300 lg:static lg:left-auto lg:top-auto lg:ml-4 lg:mt-4 lg:mr-0 lg:mb-0 lg:max-h-none lg:self-start lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="cabinet-sidebar-profile mx-4 rounded-xl border border-[rgba(192,192,192,0.5)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="cabinet-sidebar-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] font-semibold text-[#0a192f] text-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-[var(--color-text)]">{displayName}</div>
              <div className="text-sm text-[var(--color-text)]/60">Официант</div>
            </div>
          </div>
        </div>
        <nav className="mt-8 flex flex-col gap-1 px-4">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={closeSidebar}
              className={`flex items-center gap-3 rounded-[10px] px-4 py-3.5 font-medium transition-colors ${
                isActive(href)
                  ? "cabinet-nav-active border border-[#0a192f]/35 bg-[#0a192f]/12 text-[#0a192f] font-semibold"
                  : "border border-transparent text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-[10px] px-4 py-3.5 font-medium text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Выйти</span>
          </button>
        </nav>
      </div>

      <main className="min-h-screen min-w-0 flex-1 lg:ml-0 flex flex-col">
        {/* Основной блок — как шторка: отступы от краёв */}
        <div className="cabinet-main-block mt-4 mr-4 mb-4 ml-4 lg:ml-4 flex min-h-[calc(100vh-2rem)] flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <div className="p-6 lg:p-8" id="main-content">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text)] hover:bg-[var(--color-dark-gray)]/10 lg:hidden"
              aria-label="Меню"
            >
              <Menu className="h-5 w-5" />
            </button>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
