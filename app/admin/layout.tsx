"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  LayoutDashboard,
  Send,
  Users,
  Menu,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface User {
  id: string;
  login: string;
  email?: string | null;
  role: string;
  mustChangePassword?: boolean;
}

const NAV = [
  { label: "Дашборд", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Выводы", href: "/admin/payouts", icon: Send },
  { label: "Пользователи", href: "/admin/users", icon: Users },
  { label: "Поддержка", href: "/admin/support", icon: MessageCircle },
  { label: "Антифрод", href: "/admin/antifraud", icon: ShieldCheck },
] as const;

function getAdminTitle(pathname: string | null): string {
  if (!pathname) return "Админ-панель";
  if (pathname === "/admin" || pathname === "/admin/dashboard") return "Дашборд";
  if (pathname.startsWith("/admin/payouts")) return "Выводы";
  if (pathname === "/admin/users") return "Пользователи";
  if (pathname.match(/^\/admin\/users\/[^/]+$/)) return "Пользователь";
  if (pathname === "/admin/support") return "Поддержка";
  if (pathname.startsWith("/admin/support/")) return "Чат с клиентом";
  if (pathname === "/admin/antifraud") return "Антифрод";
  return "Админ-панель";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.classList.add("cabinet-page", "admin-page");
    return () => document.body.classList.remove("cabinet-page", "admin-page");
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
          let msg = "Не удалось загрузить данные.";
          try {
            const errBody = (await res.json()) as { error?: string };
            if (errBody?.error) msg += ` ${errBody.error}`;
            msg += ` Код ответа: ${res.status}. Нажмите «Повторить» или проверьте логи сервера.`;
          } catch {
            msg += ` Код ответа: ${res.status}. Нажмите «Повторить» или проверьте логи сервера.`;
          }
          setLoadError(msg);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setUser(data);

        if (data.role !== "SUPERADMIN") {
          router.replace("/cabinet");
          return;
        }

        if (data.mustChangePassword) {
          router.replace("/change-password");
          return;
        }
      } catch {
        setLoadError("Ошибка соединения. Проверьте подключение и нажмите «Повторить».");
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

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === "/admin/dashboard" || pathname === "/admin";
    return pathname?.startsWith(href) ?? false;
  };

  const closeSidebar = () => setSidebarOpen(false);

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

  if (!user || user.role !== "SUPERADMIN") {
    return null;
  }

  return (
    <div className="admin-panel cabinet-premium flex min-h-screen w-full min-w-0 max-w-full bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-4">
      {/* Шторка — как в ЛК официанта */}
      <div
        className={`admin-overlay cabinet-overlay fixed inset-0 z-30 rounded-xl border border-white/[0.12] bg-[rgba(15,23,42,0.65)] backdrop-blur-xl lg:hidden ml-4 mr-4 mt-4 mb-4 ${sidebarOpen ? "block" : "hidden"}`}
        onClick={closeSidebar}
        aria-hidden
      />

      {/* Боковая панель — такой же стиль, как в ЛК официанта: отступы, скругление, стекло, обводка */}
      <aside
        className={`admin-sidebar cabinet-sidebar fixed left-4 top-4 z-40 flex h-auto max-h-[calc(100vh-2rem)] w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-navy)] py-6 shadow-sm backdrop-blur-xl transition-transform duration-300 lg:static lg:left-auto lg:top-auto lg:ml-4 lg:mt-4 lg:mr-0 lg:mb-0 lg:max-h-none lg:self-start lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 flex" : "-translate-x-full hidden lg:flex"
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="cabinet-sidebar-profile mx-4 mb-4 rounded-xl border border-[rgba(192,192,192,0.5)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="cabinet-sidebar-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] font-semibold text-[#0a192f] text-sm">
                {(user.login || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-[var(--color-text)]">{user.login}</div>
                <div className="text-sm text-[var(--color-text)]/60">Админ</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-2">
            {NAV.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
                className={`mb-1 flex items-center gap-3 rounded-[10px] px-4 py-3.5 font-medium transition-colors ${
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
              className="mb-1 mt-4 flex w-full items-center gap-3 rounded-[10px] border border-transparent px-4 py-3.5 font-medium text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Выйти</span>
            </button>
          </nav>
        </div>
      </aside>

      <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden lg:ml-0 flex flex-col">
        <div className="admin-main-block cabinet-main-block mt-4 mr-4 mb-4 ml-4 lg:ml-4 flex min-h-[calc(100vh-2rem)] flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text)] hover:bg-[var(--color-dark-gray)]/10 lg:hidden"
            aria-label="Меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 max-w-full flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8" id="main-content">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
