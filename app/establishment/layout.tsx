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
import { PanelSidebarThemeSwitch } from "@/components/PanelSidebarThemeSwitch";
import { LkPresenceHeartbeat } from "@/components/LkPresenceHeartbeat";
import { ProactiveAccessRefresh } from "@/components/ProactiveAccessRefresh";
import { EstablishmentMobileNavPortal } from "@/components/establishment/EstablishmentMobileNavPortal";
import {
  PANEL_APP_MAIN_SURFACE_ESTABLISHMENT,
  PANEL_ESTABLISHMENT_SIDEBAR_LOGOUT,
  PANEL_ESTABLISHMENT_SIDEBAR_TITLE_LINE,
  PANEL_MAIN_CONTENT_INNER_ESTABLISHMENT,
} from "@/lib/panel-shell-visual-classes";
import { flattenPanelNavRootHrefs, isPanelMobileSubsectionPath } from "@/lib/panel-mobile-subsection";

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

const ESTABLISHMENT_MOBILE_NAV_ROOTS = flattenPanelNavRootHrefs(NAV_GROUPS);

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

  const showMobileSubsectionBack = isPanelMobileSubsectionPath(pathname, ESTABLISHMENT_MOBILE_NAV_ROOTS);

  return (
    <div className="establishment-panel cabinet-premium flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-0 lg:flex-row lg:pt-2">
      <PanelShellMobileCorner
        ariaControls="establishment-mobile-nav"
        ariaHaspopup="true"
        leadingSlot={
          showMobileSubsectionBack ? (
            <PanelMobileBackButton variant="establishment" fallbackHref="/establishment" placement="mobileToolbar" />
          ) : undefined
        }
      />
      <ProactiveAccessRefresh />
      <LkPresenceHeartbeat />
      <EstablishmentMobileNavPortal
        sidebarOpen={sidebarOpen}
        closeSidebar={closeSidebar}
        navGroups={NAV_GROUPS}
        isActive={isActive}
        handleLogout={handleLogout}
      />

      {/* Сайдбар только lg+; на мобильном — портал как в ЛК официанта */}
      <aside className="cabinet-sidebar establishment-desktop-sidebar relative hidden min-h-0 w-[14.75rem] min-w-[14.75rem] shrink-0 flex-col overflow-hidden rounded-[10px] border border-white/10 bg-white/[0.06] py-3 shadow-2xl backdrop-blur-xl lg:mt-8 lg:mb-3 lg:flex lg:max-h-[calc(100vh-0.5rem-2rem-0.75rem)] lg:self-start">
        <div className="mb-2 w-full shrink-0 px-2.5 text-center">
          <span className={PANEL_ESTABLISHMENT_SIDEBAR_TITLE_LINE}>Кабинет заведения</span>
        </div>
        <div className="cabinet-nav-block flex min-h-0 min-w-0 flex-col overflow-x-hidden overscroll-y-contain px-2.5 pb-1.5 lg:flex-none">
          <nav
            className="flex flex-col gap-0 rounded-lg border border-[var(--color-brand-gold)]/15 bg-transparent p-1 pb-1.5 shadow-[var(--shadow-subtle)]"
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
                          ? "cabinet-nav-active border font-medium text-white/90 lg:text-[#0a192f]"
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
          <PanelSidebarThemeSwitch className="mt-3 px-2.5" />
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

      <main className="relative min-h-0 min-w-0 flex-1 px-0 pt-1.5 pb-3 lg:pt-0 lg:pl-0 lg:pr-0 lg:ml-0 flex flex-col">
        <div className={PANEL_APP_MAIN_SURFACE_ESTABLISHMENT}>
          <div className={PANEL_MAIN_CONTENT_INNER_ESTABLISHMENT} id="main-content">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
