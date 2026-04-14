"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Layers,
  Building2,
  CalendarDays,
  UserCircle2,
  UtensilsCrossed,
  ConciergeBell,
  LogOut,
  Users,
  UserPlus,
  UserMinus,
  PieChart,
  BarChart3,
  Palette,
  QrCode,
  KeyRound,
  Laptop,
} from "lucide-react";
import { getAccessToken, fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePanelMobileMenu } from "@/components/PanelMobileMenuContext";
import { PanelMobileBackButton } from "@/components/PanelMobileBackButton";
import { LkPresenceHeartbeat } from "@/components/LkPresenceHeartbeat";

interface Profile {
  role: string;
  establishmentId?: string | null;
  mustChangePassword?: boolean;
}

type EstablishmentNavItem = { label: string; href: string; icon: LucideIcon };
type EstablishmentNavGroup = { title: string; items: EstablishmentNavItem[] };

const NAV_GROUPS: EstablishmentNavGroup[] = [
  {
    title: "Обзор",
    items: [
      { label: "Дашборд", href: "/establishment", icon: LayoutDashboard },
      { label: "Зал и сервис", href: "/establishment/operations", icon: Layers },
    ],
  },
  {
    title: "Работа в зале",
    items: [
      { label: "Залы и столы", href: "/establishment/halls", icon: Building2 },
      { label: "Бронь", href: "/establishment/bookings", icon: CalendarDays },
      { label: "Гости", href: "/establishment/guests", icon: UserCircle2 },
      { label: "Меню", href: "/establishment/menu", icon: UtensilsCrossed },
      { label: "Сессии обслуживания", href: "/establishment/service", icon: ConciergeBell },
    ],
  },
  {
    title: "Персонал",
    items: [
      { label: "Команда", href: "/establishment/team", icon: Users },
      { label: "Подключение сотрудников", href: "/establishment/join-requests", icon: UserPlus },
      { label: "Заявки на выход", href: "/establishment/leave-requests", icon: UserMinus },
    ],
  },
  {
    title: "Оплаты и бренд",
    items: [
      { label: "QR и печать", href: "/establishment/qr", icon: QrCode },
      { label: "Распределение", href: "/establishment/payout-rules", icon: PieChart },
      { label: "Бренд", href: "/establishment/brand", icon: Palette },
    ],
  },
  {
    title: "Аналитика и доступ",
    items: [
      { label: "Аналитика", href: "/establishment/analytics", icon: BarChart3 },
      { label: "Сессии", href: "/establishment/sessions", icon: Laptop },
      { label: "Безопасность", href: "/establishment/security", icon: KeyRound },
    ],
  },
];

export default function EstablishmentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, closeSidebar } = usePanelMobileMenu();
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
      if (!getAccessToken()) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetchWithAuth("/api/profile");

        if (res.status === 401 || res.status === 403) {
          clearAccessToken();
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
      clearAccessToken();
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

  return (
    <div className="establishment-panel cabinet-premium flex min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-[var(--color-bg)] font-[family:var(--font-inter)] text-white pt-1.5 lg:pt-3">
      <LkPresenceHeartbeat />
      {/* Шторка на мобильном */}
      <div
        className={`cabinet-overlay fixed inset-0 z-[90] bg-[rgba(15,23,42,0.65)] backdrop-blur-xl transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden
      />

      {/* Сайдбар выше затемнения (fixed + z); на lg остаётся в потоке */}
      <aside
        id="establishment-mobile-nav"
        className={`cabinet-sidebar fixed left-0 top-0 z-[100] flex max-h-[100vh] w-[min(calc(100vw-4rem),19.25rem)] max-w-[19.25rem] flex-col overflow-y-auto overflow-x-hidden rounded-[10px] border border-white/10 py-3 shadow-2xl backdrop-blur-xl transition-[transform] duration-300 ease-out lg:static lg:left-auto lg:top-auto lg:ml-0 lg:mt-1.5 lg:mr-0 lg:mb-0 lg:max-h-none lg:z-auto lg:w-[14.75rem] lg:max-w-none lg:translate-x-0 lg:border lg:self-start bg-white/[0.06] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 w-full shrink-0 px-2.5 text-center">
          <span className="inline-block font-[family:var(--font-playfair)] text-[1.0625rem] font-bold leading-tight text-white">
            Кабинет заведения
          </span>
        </div>
        <div className="cabinet-nav-block flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2.5 pb-1.5">
          <nav
            className="flex flex-col gap-0 rounded-lg border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 p-1 pb-1.5 shadow-[var(--shadow-subtle)]"
            aria-label="Навигация по кабинету заведения"
          >
            {NAV_GROUPS.map((group) => (
              <div
                key={group.title}
                className="mt-2 border-t border-white/[0.08] pt-2 first:mt-0 first:border-t-0 first:pt-0"
                role="group"
                aria-label={group.title}
              >
                <div className="px-2 pb-1 pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white/40">
                  {group.title}
                </div>
                <div className="flex flex-col gap-px">
                  {group.items.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeSidebar}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-[0.4375rem] text-sm font-normal leading-snug transition-colors ${
                        isActive(href)
                          ? "cabinet-nav-active border border-[#0a192f]/35 bg-[#0a192f]/12 text-[#0a192f] font-medium"
                          : "border border-transparent text-white/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-white"
                      }`}
                    >
                      <Icon className="cabinet-nav-item-icon size-[1.125rem] shrink-0" aria-hidden />
                      <span className="min-w-0 break-words">{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-[0.8125rem] font-medium text-white/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-white"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <main className="relative min-h-0 min-w-0 flex-1 px-0 pt-1.5 pb-3 lg:pt-2 lg:pl-0 lg:pr-0 lg:ml-0 flex flex-col">
        <div className="cabinet-main-block app-panel-main-surface relative z-10 mt-0 mr-0 mb-3 ml-0 flex min-h-0 flex-1 flex-col rounded-lg border-x border-b border-white/10 bg-white/[0.06] backdrop-blur-xl md:rounded-[10px] lg:z-0 lg:mr-0 lg:ml-3 lg:rounded-[10px]">
          {pathname !== "/establishment" && (
            <PanelMobileBackButton variant="establishment" fallbackHref="/establishment" />
          )}
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-2 sm:px-6 sm:py-3 md:py-4 lg:px-8 lg:py-5"
            id="main-content"
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
