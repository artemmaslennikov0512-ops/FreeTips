"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  List,
  Link2,
  Settings,
  LogOut,
  MessageCircle,
  ShieldCheck,
  BadgeCheck,
  Building2,
  User,
  UserPlus,
  UserMinus,
  Laptop,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import { CABINET_WAITER_BTN } from "@/lib/cabinet-button-classes";
import { fetchWithAuth, clearAccessToken, migrateLegacyAccessTokenToCookie } from "@/lib/auth-client";
import { isCabinetImpersonating } from "@/lib/cabinet-impersonation-state";
import { endCabinetImpersonation } from "@/lib/cabinet-impersonation";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { isCabinetM5CompetitionTheme } from "@/config/cabinet-theme-logins";
import {
  CabinetMobileNavProvider,
  CabinetMobileNavPortals,
  CabinetMobileNavMobileCorner,
  type CabinetMobileNavContextValue,
} from "@/components/cabinet/CabinetMobileNav";
import { usePanelMobileMenu } from "@/components/PanelMobileMenuContext";
import { LkPresenceHeartbeat } from "@/components/LkPresenceHeartbeat";
import { ProactiveAccessRefresh } from "@/components/ProactiveAccessRefresh";
import { PanelMobileBackButton } from "@/components/PanelMobileBackButton";
import { PanelSidebarThemeSwitch } from "@/components/PanelSidebarThemeSwitch";
import { readCabinetNavRoleCache, writeCabinetNavRoleCache } from "@/lib/cabinet-nav-role-cache";
import { useTheme } from "@/lib/theme-context";
import {
  PANEL_APP_MAIN_SURFACE_CABINET,
  PANEL_MAIN_CONTENT_INNER_ADMIN_CABINET,
  PANEL_NAV_WRAP_CABINET,
  PANEL_SIDEBAR_NAV_GROUP_SEPARATOR_CABINET,
  PANEL_SIDEBAR_NAV_ICON,
  PANEL_SIDEBAR_NAV_LINK_INACTIVE_CABINET,
  PANEL_SIDEBAR_NAV_LINK_ROW,
} from "@/lib/panel-shell-visual-classes";
import { flattenPanelNavRootHrefs, isPanelMobileSubsectionPath } from "@/lib/panel-mobile-subsection";

const CABINET_LG_SIDEBAR_COLLAPSED_KEY = "cabinet-lg-sidebar-collapsed";

const LG_SIDEBAR_COLLAPSE_BTN =
  "cabinet-lg-sidebar-toggle cabinet-lg-sidebar-toggle--collapse relative z-30 inline-flex h-8 min-h-8 w-[2.125rem] shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10 px-0 text-[var(--color-text)] shadow-none transition-[color,background-color,border-color] duration-200 hover:border-white/35 hover:bg-white/[0.14] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

const LG_SIDEBAR_EXPAND_BTN =
  "cabinet-lg-sidebar-toggle cabinet-lg-sidebar-toggle--expand fixed left-0 top-1/2 z-[35] hidden h-8 min-h-8 w-[2.125rem] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-md border border-white/20 bg-[var(--color-navy)] px-0 text-[var(--color-text)] shadow-none transition-[color,background-color,border-color] duration-200 hover:border-white/35 hover:bg-white/[0.08] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent lg:inline-flex";

type CabinetNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  recipientOnly?: boolean;
  employeeOnly?: boolean;
  waiterFloorOnly?: boolean;
};

type CabinetNavGroup = { title: string; items: CabinetNavItem[] };

const NAV_GROUPS: CabinetNavGroup[] = [
  {
    title: "Обзор",
    items: [
      { label: "Дашборд", href: "/cabinet", icon: LayoutDashboard },
      { label: "Зал", href: "/cabinet/floor", icon: LayoutGrid, waiterFloorOnly: true },
      { label: "История операций", href: "/cabinet/transactions", icon: List },
      { label: "Моя ссылка", href: "/cabinet/link", icon: Link2 },
    ],
  },
  {
    title: "Моё заведение",
    items: [
      {
        label: "Подключиться к заведению",
        href: "/cabinet/join-establishment",
        icon: UserPlus,
        recipientOnly: true,
      },
      {
        label: "Покинуть заведение",
        href: "/cabinet/leave-establishment",
        icon: UserMinus,
        employeeOnly: true,
      },
    ],
  },
  {
    title: "Профиль",
    items: [
      { label: "Верификация", href: "/cabinet/verification", icon: ShieldCheck },
      { label: "Сессии", href: "/cabinet/sessions", icon: Laptop },
      { label: "Настройки профиля", href: "/cabinet/settings", icon: Settings },
    ],
  },
  {
    title: "Поддержка",
    items: [{ label: "Поддержка", href: "/cabinet/support", icon: MessageCircle }],
  },
];

const CABINET_MOBILE_NAV_ROOTS = flattenPanelNavRootHrefs(NAV_GROUPS);

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { sidebarOpen, setSidebarOpen, closeSidebar, menuButtonRef } = usePanelMobileMenu();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{
    login?: string;
    role?: string;
    fullName?: string | null;
    verificationStatus?: string;
    employeePhotoUrl?: string | null;
    establishmentBrand?: {
      logoUrl: string | null;
      logoOpacityPercent: number | null;
      primaryColor: string | null;
      secondaryColor: string | null;
      mainBackgroundColor: string | null;
      blocksBackgroundColor: string | null;
      fontColor: string | null;
      borderColor: string | null;
    } | null;
  } | null>(null);
  /** Подхват роли из sessionStorage до paint, чтобы «Подключиться к заведению» не пропадал на время запроса профиля. */
  const [cachedNavRole, setCachedNavRole] = useState<string | null>(null);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [lgSidebarCollapsed, setLgSidebarCollapsed] = useState(false);
  const [adminCabinetView, setAdminCabinetView] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const r = readCabinetNavRoleCache();
    if (r) setCachedNavRole(r);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    setAdminCabinetView(isCabinetImpersonating());
  }, [mounted, pathname]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      if (localStorage.getItem(CABINET_LG_SIDEBAR_COLLAPSED_KEY) === "1") {
        setLgSidebarCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, [mounted]);

  const setSidebarCollapsedPersisted = useCallback((collapsed: boolean) => {
    setLgSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(CABINET_LG_SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("cabinet-page");
    return () => document.body.classList.remove("cabinet-page");
  }, []);

  const hex = (s: string | null | undefined) => (s && /^#[0-9A-Fa-f]{6}$/i.test(s) ? s : undefined);
  const brand = user?.establishmentBrand;
  const brandPrimary = hex(brand?.primaryColor ?? null);
  const brandSecondary = hex(brand?.secondaryColor ?? null);
  const brandMainBg = hex(brand?.mainBackgroundColor ?? null);
  const brandBlocksBg = hex(brand?.blocksBackgroundColor ?? null);
  const brandFont = hex(brand?.fontColor ?? null);
  const brandBorder = hex(brand?.borderColor ?? null);

  const hasBrand =
    !!brandPrimary || !!brandSecondary || !!brandMainBg || !!brandBlocksBg || !!brandFont || !!brandBorder;
  const isM5Cabinet = isCabinetM5CompetitionTheme(user?.login);
  const applyEstablishmentBrand = hasBrand && !isM5Cabinet;

  useLayoutEffect(() => {
    if (isM5Cabinet) {
      document.body.style.backgroundColor = theme === "dark" ? "#08090b" : "";
      return () => {
        document.body.style.backgroundColor = "";
      };
    }
    if (brandMainBg && applyEstablishmentBrand) {
      document.body.style.backgroundColor = brandMainBg;
      return () => {
        document.body.style.backgroundColor = "";
      };
    }
    document.body.style.backgroundColor = "";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [isM5Cabinet, theme, brandMainBg, applyEstablishmentBrand]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    void migrateLegacyAccessTokenToCookie().then(() =>
      fetchWithAuth("/api/profile")
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          clearAccessToken();
          router.replace("/login");
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data?.role === "ADMIN" || data?.role === "SUPERADMIN") {
          writeCabinetNavRoleCache(data.role);
          router.replace("/admin/dashboard");
          return;
        }
        if (data?.mustChangePassword) {
          if (data.role) writeCabinetNavRoleCache(data.role);
          router.replace("/change-password");
          return;
        }
        if (data) {
          if (data.role) writeCabinetNavRoleCache(data.role);
          setUser({
            login: data.login,
            role: data.role,
            fullName: data.fullName,
            verificationStatus: data.verificationStatus,
            employeePhotoUrl: data.employeePhotoUrl ?? null,
            establishmentBrand: data.establishmentBrand ?? null,
          });
        }
      })
      .catch(() => {}));
  }, [mounted, router]);

  const fetchSupportUnread = useCallback(() => {
    fetchWithAuth("/api/support/unread-count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (data && typeof data.count === "number") setSupportUnreadCount(data.count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    fetchSupportUnread();
    if (pathname === "/cabinet/support") {
      const t = setTimeout(fetchSupportUnread, 1500);
      return () => clearTimeout(t);
    }
  }, [mounted, pathname, fetchSupportUnread]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        fetchSupportUnread();
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchSupportUnread]);

  const handleLogout = useCallback(async () => {
    if (isCabinetImpersonating()) {
      const path = endCabinetImpersonation();
      setAdminCabinetView(false);
      router.replace(path);
      return;
    }
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
  }, [router]);

  const isActive = useCallback(
    (href: string) => (href === "/cabinet" ? pathname === "/cabinet" : pathname.startsWith(href)),
    [pathname],
  );

  const trimmedFullName = user?.fullName?.trim() ?? "";
  const sidebarFirstName = trimmedFullName ? trimmedFullName.split(/\s+/)[0]! : null;
  const sidebarDisplayLabel = sidebarFirstName ?? user?.login ?? "";

  const brandStyle: React.CSSProperties & Record<string, string> = {};
  if (applyEstablishmentBrand) {
    if (brandPrimary) brandStyle["--color-brand-gold"] = brandPrimary;
    if (brandMainBg) brandStyle.backgroundColor = brandMainBg;
    if (brandFont) {
      brandStyle.color = brandFont;
      brandStyle["--color-text"] = brandFont;
      brandStyle["--color-text-secondary"] = brandFont + "e6";
      brandStyle["--color-muted"] = brandFont + "99";
    }
    if (brandBlocksBg) {
      brandStyle["--color-bg-sides"] = brandBlocksBg;
      brandStyle["--cabinet-block-bg"] = brandBlocksBg;
    }
    if (brandBorder) brandStyle["--cabinet-border-color"] = brandBorder;
  }
  const sidebarBg = applyEstablishmentBrand ? (brandBlocksBg ?? brandSecondary) : undefined;
  if (applyEstablishmentBrand && sidebarBg) {
    brandStyle["--cabinet-sidebar-surface-bg"] = sidebarBg;
  }
  const mainBlockBg = applyEstablishmentBrand ? (brandBlocksBg ?? brandSecondary) : undefined;

  const sidebarStyle = useMemo<React.CSSProperties>(() => {
    if (isM5Cabinet) return {};
    const brandExtras =
      brandBorder && applyEstablishmentBrand ? { borderColor: brandBorder as string } : {};
    /* Светлая тема: фон модалки моб. меню задаёт CSS; не подставляем «стекло» тёмной темы */
    if (theme === "light") {
      return sidebarBg ? { backgroundColor: sidebarBg, ...brandExtras } : { ...brandExtras };
    }
    return {
      backgroundColor: sidebarBg ?? "rgba(255,255,255,0.06)",
      ...brandExtras,
    };
  }, [isM5Cabinet, sidebarBg, brandBorder, applyEstablishmentBrand, theme]);

  const mainBlockStyle = useMemo<React.CSSProperties>(() => {
    if (isM5Cabinet) return {};
    const brandExtras =
      brandBorder && applyEstablishmentBrand ? { borderColor: brandBorder as string } : {};
    if (theme === "light") {
      return mainBlockBg ? { backgroundColor: mainBlockBg, ...brandExtras } : { ...brandExtras };
    }
    return {
      backgroundColor: mainBlockBg ?? "rgba(255,255,255,0.06)",
      ...brandExtras,
    };
  }, [isM5Cabinet, mainBlockBg, brandBorder, applyEstablishmentBrand, theme]);

  const profileBlockStyle = useMemo<React.CSSProperties>(() => {
    if (!isM5Cabinet && sidebarBg) return { backgroundColor: sidebarBg };
    return {};
  }, [isM5Cabinet, sidebarBg]);

  const navActiveClasses = isM5Cabinet
    ? "cabinet-nav-active cabinet-nav-active-m5 font-medium text-[var(--color-text)]"
    : "cabinet-nav-active border font-medium";

  const effectiveNavRole = user?.role ?? cachedNavRole;
  const itemVisible = useCallback(
    (item: CabinetNavItem) => {
      if (item.recipientOnly && effectiveNavRole !== "RECIPIENT") return false;
      if (item.employeeOnly && effectiveNavRole !== "EMPLOYEE") return false;
      if (item.waiterFloorOnly && effectiveNavRole !== "EMPLOYEE") return false;
      return true;
    },
    [effectiveNavRole],
  );
  const visibleNavGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ title: g.title, items: g.items.filter(itemVisible) })).filter((g) => g.items.length > 0),
    [itemVisible],
  );

  const mobileNavValue = useMemo<CabinetMobileNavContextValue>(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      closeSidebar,
      menuButtonRef,
      user,
      supportUnreadCount,
      navGroups: visibleNavGroups,
      isActive,
      navActiveClasses,
      handleLogout,
      logoutButtonLabel: adminCabinetView ? "Выйти из просмотра" : "Выйти",
      sidebarStyle,
      profileBlockStyle,
      sidebarBg,
      isM5Cabinet,
      brandFont,
      sidebarDisplayLabel,
      sidebarFirstName,
    }),
    [
      sidebarOpen,
      setSidebarOpen,
      closeSidebar,
      menuButtonRef,
      user,
      supportUnreadCount,
      visibleNavGroups,
      isActive,
      navActiveClasses,
      handleLogout,
      adminCabinetView,
      sidebarStyle,
      profileBlockStyle,
      sidebarBg,
      isM5Cabinet,
      brandFont,
      sidebarDisplayLabel,
      sidebarFirstName,
    ],
  );

  if (!mounted) {
    return <LoadingSpinner message="Загрузка…" className="min-h-[60vh]" />;
  }

  const showMobileSubsectionBack = isPanelMobileSubsectionPath(pathname, CABINET_MOBILE_NAV_ROOTS);

  return (
    <CabinetMobileNavProvider value={mobileNavValue}>
    <ProactiveAccessRefresh />
    <LkPresenceHeartbeat />
    <div
      className={`cabinet-premium flex min-h-screen w-full max-w-full flex-col overflow-x-hidden font-[family:var(--font-inter)] text-[var(--color-text)] max-lg:pt-0 lg:flex-row lg:pt-[max(0.5rem,env(safe-area-inset-top,0px))] ${isM5Cabinet ? "bg-transparent" : "bg-[var(--color-bg)]"}`}
      data-brand-active={applyEstablishmentBrand ? "true" : undefined}
      data-cabinet-theme={isM5Cabinet ? "m5-competition" : undefined}
      style={Object.keys(brandStyle).length ? brandStyle : undefined}
    >
      <CabinetMobileNavMobileCorner
        leadingSlot={
          showMobileSubsectionBack ? (
            <PanelMobileBackButton variant="cabinet" fallbackHref="/cabinet" placement="mobileToolbar" />
          ) : undefined
        }
      />
      {/* Левое меню (lg+): сворачиваемая колонка; на мобильном — портал меню */}
      <div
        className={`hidden shrink-0 transition-[width] duration-300 ease-out lg:mt-9 lg:mb-3 lg:flex lg:self-start ${
          lgSidebarCollapsed
            ? "lg:w-0 lg:pointer-events-none lg:overflow-hidden"
            : "lg:relative lg:z-10 lg:w-[236px] lg:overflow-hidden"
        }`}
      >
        <div
          className="cabinet-sidebar relative flex min-h-0 w-[236px] min-w-[236px] flex-col overflow-hidden border-0 border-r border-white/10 py-4 shadow-2xl backdrop-blur-xl lg:static lg:h-auto lg:max-h-[calc(100vh-0.5rem-2.25rem-0.75rem)] lg:rounded-[10px] lg:border-x lg:border-b lg:border-t-0 lg:border-white/10"
          style={sidebarStyle}
        >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        {user?.establishmentBrand?.logoUrl && (
          <div className="mx-3 mb-2 flex justify-center">
            <Image
              src={user.establishmentBrand.logoUrl}
              alt=""
              width={140}
              height={32}
              unoptimized
              className="h-8 w-auto max-w-[140px] object-contain"
              style={{ opacity: user.establishmentBrand.logoOpacityPercent != null ? user.establishmentBrand.logoOpacityPercent / 100 : 0.95 }}
            />
          </div>
        )}
        <div
          className="cabinet-sidebar-profile cabinet-block-inner mx-3 rounded-[10px] border border-[rgba(197,165,114,0.55)] px-3 py-2.5"
          style={Object.keys(profileBlockStyle).length ? profileBlockStyle : undefined}
        >
          <div className="flex items-center gap-2.5">
            {user?.employeePhotoUrl ? (
              <Image
                src={user.employeePhotoUrl}
                alt=""
                width={44}
                height={44}
                unoptimized
                className="cabinet-sidebar-avatar h-11 w-11 shrink-0 rounded-full object-cover bg-[var(--color-brand-gold)]"
              />
            ) : (
              <div
                className={`cabinet-sidebar-avatar flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] ${isM5Cabinet ? "text-white" : "text-[#0a192f]"}`}
                aria-hidden
              >
                <User className="h-6 w-6" strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`truncate font-medium ${isM5Cabinet && sidebarFirstName ? "text-[#8ec5ff]" : "text-[var(--color-text)]"}`}
                  style={!isM5Cabinet || !sidebarFirstName ? (brandFont ? { color: brandFont } : undefined) : undefined}
                >
                  {sidebarDisplayLabel}
                </span>
                {user?.verificationStatus === "VERIFIED" && (
                  <BadgeCheck
                    className={`h-4 w-4 shrink-0 ${isM5Cabinet ? "text-[#1c69d4]" : "text-blue-500"}`}
                    aria-label="Аккаунт верифицирован"
                  />
                )}
              </div>
              <div className="text-xs text-[var(--color-text)]/80" style={brandFont ? { color: brandFont } : undefined}>Официант</div>
            </div>
          </div>
        </div>
        <div className="mb-2 mt-4 flex h-8 shrink-0 items-center px-3">
          <span className="w-8 shrink-0 select-none" aria-hidden />
          <span className="cabinet-nav-label min-w-0 flex-1 text-center text-xs font-medium uppercase leading-none tracking-wider text-[var(--color-text)]/50">
            Навигация
          </span>
          <div className="flex h-8 min-w-[2.125rem] shrink-0 items-center justify-end">
            <button
              type="button"
              onClick={() => setSidebarCollapsedPersisted(true)}
              className={LG_SIDEBAR_COLLAPSE_BTN}
              aria-label="Скрыть боковое меню"
              title="Скрыть меню"
            >
              <span className="pointer-events-none inline-flex items-center justify-center" aria-hidden>
                <ChevronLeft className="h-3.5 w-3.5 shrink-0 -mr-[5px]" strokeWidth={2} />
                <ChevronLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              </span>
            </button>
          </div>
        </div>
        <div className="cabinet-nav-block flex min-h-0 min-w-0 flex-col overflow-x-hidden px-3 lg:flex-none">
          <nav className={PANEL_NAV_WRAP_CABINET} aria-label="Навигация по кабинету">
            {visibleNavGroups.map((group) => (
              <div
                key={group.title}
                className={PANEL_SIDEBAR_NAV_GROUP_SEPARATOR_CABINET}
                role="group"
                aria-label={group.title}
              >
                <div className="cabinet-nav-group-title px-2.5 pb-2 pt-1 text-[0.6875rem] font-semibold uppercase leading-snug tracking-[0.12em]">
                  {group.title}
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.items.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeSidebar}
                      className={`${PANEL_SIDEBAR_NAV_LINK_ROW} ${
                        isActive(href) ? navActiveClasses : PANEL_SIDEBAR_NAV_LINK_INACTIVE_CABINET
                      }`}
                      style={!isActive(href) && brandFont ? { color: `${brandFont}cc` } : undefined}
                    >
                      <Icon className={PANEL_SIDEBAR_NAV_ICON} aria-hidden />
                      <span>{label}</span>
                      {href === "/cabinet/support" && supportUnreadCount > 0 && (
                        <span
                          className="cabinet-support-unread-badge ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-xs font-semibold text-white"
                          aria-label={`Непрочитанных: ${supportUnreadCount}`}
                        >
                          {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {user?.role === "ESTABLISHMENT_ADMIN" && (
              <div className={PANEL_SIDEBAR_NAV_GROUP_SEPARATOR_CABINET} role="group" aria-label="Связанные кабинеты">
                <div className="cabinet-nav-group-title px-2.5 pb-2 pt-1 text-[0.6875rem] font-semibold uppercase leading-snug tracking-[0.12em]">
                  Связанные кабинеты
                </div>
                <div className="flex flex-col gap-0.5">
                  <Link
                    href="/establishment"
                    onClick={closeSidebar}
                    className={`${PANEL_SIDEBAR_NAV_LINK_ROW} ${PANEL_SIDEBAR_NAV_LINK_INACTIVE_CABINET}`}
                    style={brandFont ? { color: `${brandFont}cc` } : undefined}
                  >
                    <Building2 className={PANEL_SIDEBAR_NAV_ICON} aria-hidden />
                    <span>Кабинет заведения</span>
                  </Link>
                </div>
              </div>
            )}
          </nav>
          <PanelSidebarThemeSwitch variant={isM5Cabinet ? "m5" : "default"} className="mt-4 px-3" />
          <button
            type="button"
            onClick={handleLogout}
            className={`mt-3 flex shrink-0 ${CABINET_WAITER_BTN} w-full !justify-center gap-2.5 px-3 py-2 text-sm`}
          >
            <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
            <span>{adminCabinetView ? "Выйти из просмотра" : "Выйти"}</span>
          </button>
        </div>
        </div>
        </div>
      </div>

      {lgSidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsedPersisted(false)}
          className={LG_SIDEBAR_EXPAND_BTN}
          aria-label="Показать боковое меню"
          title="Меню"
        >
          <span className="pointer-events-none inline-flex items-center justify-center" aria-hidden>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 -mr-[5px]" strokeWidth={2} />
            <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          </span>
        </button>
      )}

      <main className="relative min-h-screen min-w-0 flex-1 px-0 max-lg:pt-0 pt-1.5 pb-3 lg:px-0 lg:pt-0 lg:pr-3 lg:ml-0 lg:mr-0 flex flex-col">
        <div className={PANEL_APP_MAIN_SURFACE_CABINET} style={mainBlockStyle}>
          <div className={PANEL_MAIN_CONTENT_INNER_ADMIN_CABINET} id="main-content">
            {children}
          </div>
        </div>
      </main>
      <CabinetMobileNavPortals />
    </div>
    </CabinetMobileNavProvider>
  );
}
