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
import { fetchWithAuth, clearAccessToken, migrateLegacyAccessTokenToCookie } from "@/lib/auth-client";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePanelMobileMenu } from "@/components/PanelMobileMenuContext";
import { PanelShellMobileCorner } from "@/components/PanelShellMobileCorner";
import { PanelMobileBackButton } from "@/components/PanelMobileBackButton";
import { LkPresenceHeartbeat } from "@/components/LkPresenceHeartbeat";
import { ProactiveAccessRefresh } from "@/components/ProactiveAccessRefresh";
import { usePanelMobileSimpleDrawerEffects } from "@/lib/use-panel-mobile-simple-drawer-effects";
import {
  PANEL_MOBILE_NAV_OVERLAY_TRANSITION,
  PANEL_MOBILE_Z_ESTABLISHMENT_DRAWER,
  PANEL_MOBILE_Z_ESTABLISHMENT_OVERLAY,
} from "@/lib/panel-mobile-ui";
import {
  PANEL_APP_MAIN_SURFACE_ESTABLISHMENT,
  PANEL_ESTABLISHMENT_SIDEBAR_LOGOUT,
  PANEL_ESTABLISHMENT_SIDEBAR_TITLE_LINE,
  PANEL_MAIN_CONTENT_INNER_ESTABLISHMENT,
} from "@/lib/panel-shell-visual-classes";

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

  usePanelMobileSimpleDrawerEffects(sidebarOpen, closeSidebar);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const checkAuth = async () => {
      await migrateLegacyAccessTokenToCookie();
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
    <div className="establishment-panel cabinet-premium flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-0 lg:flex-row lg:pt-3">
      <PanelShellMobileCorner
        ariaControls="establishment-mobile-nav"
        ariaHaspopup="true"
        leadingSlot={
          pathname !== "/establishment" ? (
            <PanelMobileBackButton variant="establishment" fallbackHref="/establishment" placement="mobileToolbar" />
          ) : undefined
        }
      />
      <ProactiveAccessRefresh />
      <LkPresenceHeartbeat />
      {/* Шторка на мобильном */}
      <div
        className={`cabinet-overlay mobile-drawer-screen-bleed fixed ${PANEL_MOBILE_Z_ESTABLISHMENT_OVERLAY} backdrop-blur-xl ${PANEL_MOBILE_NAV_OVERLAY_TRANSITION} ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden
      />

      {/* Сайдбар выше затемнения (fixed + z); на lg остаётся в потоке */}
      <aside
        id="establishment-mobile-nav"
        className={`cabinet-sidebar establishment-mobile-sidebar fixed ${PANEL_MOBILE_Z_ESTABLISHMENT_DRAWER} flex min-h-0 flex-col overflow-hidden rounded-[10px] border border-white/10 shadow-2xl backdrop-blur-xl transition-[transform] duration-300 ease-out bg-white/[0.06] max-lg:left-[max(0.5rem,env(safe-area-inset-left,0px))] max-lg:top-[max(0.5rem,env(safe-area-inset-top,0px))] max-lg:bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] max-lg:w-[min(19.25rem,calc(100vw-1.25rem-max(env(safe-area-inset-left,0px),0.5rem)-max(env(safe-area-inset-right,0px),0.5rem)))] max-lg:max-w-none max-lg:py-2 max-lg:min-w-0 lg:static lg:left-auto lg:top-auto lg:bottom-auto lg:ml-0 lg:mt-1.5 lg:mr-0 lg:mb-0 lg:max-h-none lg:z-auto lg:w-[14.75rem] lg:max-w-none lg:translate-x-0 lg:border lg:self-start lg:py-3 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full max-lg:pointer-events-none"
        }`}
      >
        <div className="mb-2 w-full shrink-0 px-2.5 text-center max-lg:mb-1.5">
          <span className={PANEL_ESTABLISHMENT_SIDEBAR_TITLE_LINE}>Кабинет заведения</span>
        </div>
        <div className="cabinet-nav-block flex min-h-0 min-w-0 flex-col overflow-x-hidden overscroll-y-contain px-2.5 pb-1.5 max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-hidden lg:flex-none">
          <nav
            className="flex flex-col gap-0 rounded-lg border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 p-1 pb-1.5 shadow-[var(--shadow-subtle)] max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto"
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
            className={PANEL_ESTABLISHMENT_SIDEBAR_LOGOUT}
          >
            <LogOut className="size-4 shrink-0" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <main className="relative min-h-0 min-w-0 flex-1 px-0 pt-1.5 pb-3 lg:pt-2 lg:pl-0 lg:pr-0 lg:ml-0 flex flex-col">
        <div className={PANEL_APP_MAIN_SURFACE_ESTABLISHMENT}>
          <div className={PANEL_MAIN_CONTENT_INNER_ESTABLISHMENT} id="main-content">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
