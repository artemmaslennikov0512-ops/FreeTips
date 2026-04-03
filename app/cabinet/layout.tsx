"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { CABINET_WAITER_BTN } from "@/lib/cabinet-button-classes";
import { getAccessToken, fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { isCabinetM5CompetitionTheme } from "@/config/cabinet-theme-logins";
import { CabinetMobileNavProvider, CabinetMobileNavPortals, type CabinetMobileNavContextValue } from "@/components/cabinet/CabinetMobileNav";
import { usePanelMobileMenu } from "@/components/PanelMobileMenuContext";
const NAV: { label: string; href: string; icon: LucideIcon; iconClass: string }[] = [
  { label: "Дашборд", href: "/cabinet", icon: LayoutDashboard, iconClass: "!text-sky-400" },
  { label: "Операции", href: "/cabinet/transactions", icon: List, iconClass: "!text-emerald-400" },
  { label: "Моя ссылка", href: "/cabinet/link", icon: Link2, iconClass: "!text-amber-400" },
  { label: "Верификация", href: "/cabinet/verification", icon: ShieldCheck, iconClass: "!text-violet-400" },
  { label: "Поддержка", href: "/cabinet/support", icon: MessageCircle, iconClass: "!text-cyan-400" },
  { label: "Настройки профиля", href: "/cabinet/settings", icon: Settings, iconClass: "!text-orange-400" },
];

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  useEffect(() => setMounted(true), []);

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

  useEffect(() => {
    if (isM5Cabinet) {
      document.body.style.backgroundColor = "#08090b";
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
  }, [isM5Cabinet, brandMainBg, applyEstablishmentBrand]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
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
          router.replace("/admin/dashboard");
          return;
        }
        if (data?.mustChangePassword) {
          router.replace("/change-password");
          return;
        }
        if (data) setUser({
          login: data.login,
          role: data.role,
          fullName: data.fullName,
          verificationStatus: data.verificationStatus,
          employeePhotoUrl: data.employeePhotoUrl ?? null,
          establishmentBrand: data.establishmentBrand ?? null,
        });
      })
      .catch(() => {});
  }, [mounted, router]);

  const fetchSupportUnread = useCallback(() => {
    if (!getAccessToken()) return;
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
      if (document.visibilityState === "visible" && getAccessToken()) {
        fetchSupportUnread();
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchSupportUnread]);

  const handleLogout = useCallback(async () => {
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

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen, closeSidebar]);

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
  const mainBlockBg = applyEstablishmentBrand ? (brandBlocksBg ?? brandSecondary) : undefined;
  const sidebarStyle: React.CSSProperties = isM5Cabinet
    ? {}
    : {
        backgroundColor: sidebarBg ?? "rgba(255,255,255,0.06)",
        ...(brandBorder && applyEstablishmentBrand ? { borderColor: brandBorder } : {}),
      };
  const mainBlockStyle: React.CSSProperties = isM5Cabinet
    ? {}
    : {
        backgroundColor: mainBlockBg ?? "rgba(255,255,255,0.06)",
        ...(brandBorder && applyEstablishmentBrand ? { borderColor: brandBorder } : {}),
      };
  const profileBlockStyle: React.CSSProperties =
    !isM5Cabinet && sidebarBg ? { backgroundColor: sidebarBg } : {};

  const navActiveClasses = isM5Cabinet
    ? "cabinet-nav-active cabinet-nav-active-m5 font-semibold text-[var(--color-text)]"
    : "cabinet-nav-active border border-[#0a192f]/25 bg-[#0a192f]/10 text-[#0a192f] font-semibold";

  const mobileNavValue = useMemo<CabinetMobileNavContextValue>(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      closeSidebar,
      menuButtonRef,
      user,
      supportUnreadCount,
      NAV,
      isActive,
      navActiveClasses,
      handleLogout,
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
      isActive,
      navActiveClasses,
      handleLogout,
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

  return (
    <CabinetMobileNavProvider value={mobileNavValue}>
    <div
      className={`cabinet-premium flex min-h-screen w-full max-w-full overflow-x-hidden font-[family:var(--font-inter)] text-[var(--color-text)] pt-3 lg:pt-5 ${isM5Cabinet ? "bg-transparent" : "bg-[var(--color-bg)]"}`}
      data-brand-active={applyEstablishmentBrand ? "true" : undefined}
      data-cabinet-theme={isM5Cabinet ? "m5-competition" : undefined}
      style={Object.keys(brandStyle).length ? brandStyle : undefined}
    >
      {/* Левое меню: только на десктопе (lg+); на мобильном навигация в выпадающем списке под кнопкой */}
      <div
        className={`cabinet-sidebar hidden lg:flex fixed left-0 top-0 z-40 h-full w-[min(calc(100vw-4rem),20rem)] max-w-[20rem] flex-col overflow-hidden border-0 border-r border-white/10 py-6 shadow-2xl backdrop-blur-xl transition-[transform] duration-300 ease-out lg:static lg:left-auto lg:top-auto lg:ml-0 lg:mt-3 lg:mr-0 lg:mb-0 lg:h-auto lg:max-h-[calc(100vh-2rem)] lg:w-[260px] lg:max-w-none lg:translate-x-0 lg:rounded-[10px] lg:border-x lg:border-b lg:border-t-0 lg:border-white/10 lg:self-start`}
        style={sidebarStyle}
      >
        {user?.establishmentBrand?.logoUrl && (
          <div className="mx-4 mb-3 flex justify-center">
            <img
              src={user.establishmentBrand.logoUrl}
              alt=""
              className="h-8 w-auto max-w-[140px] object-contain"
              style={{ opacity: user.establishmentBrand.logoOpacityPercent != null ? user.establishmentBrand.logoOpacityPercent / 100 : 0.95 }}
            />
          </div>
        )}
        <div
          className={`cabinet-sidebar-profile cabinet-block-inner mx-4 rounded-[10px] border border-[var(--color-brand-gold)]/20 px-4 py-3 ${!sidebarBg ? "bg-[var(--color-dark-gray)]/10" : ""}`}
          style={Object.keys(profileBlockStyle).length ? profileBlockStyle : undefined}
        >
          <div className="flex items-center gap-3">
            {user?.employeePhotoUrl ? (
              <img
                src={user.employeePhotoUrl}
                alt=""
                className="cabinet-sidebar-avatar h-14 w-14 shrink-0 rounded-full object-cover bg-[var(--color-brand-gold)]"
              />
            ) : (
              <div
                className={`cabinet-sidebar-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] ${isM5Cabinet ? "text-white" : "text-[#0a192f]"}`}
                aria-hidden
              >
                <User className="h-7 w-7" strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`truncate font-semibold ${isM5Cabinet && sidebarFirstName ? "text-[#8ec5ff]" : "text-[var(--color-text)]"}`}
                  style={!isM5Cabinet || !sidebarFirstName ? (brandFont ? { color: brandFont } : undefined) : undefined}
                >
                  {sidebarDisplayLabel}
                </span>
                {user?.verificationStatus === "VERIFIED" && (
                  <BadgeCheck
                    className={`h-5 w-5 shrink-0 ${isM5Cabinet ? "text-[#1c69d4]" : "text-blue-500"}`}
                    aria-label="Аккаунт верифицирован"
                  />
                )}
              </div>
              <div className="text-sm text-[var(--color-text)]/80" style={brandFont ? { color: brandFont } : undefined}>Официант</div>
            </div>
          </div>
        </div>
        <div className="cabinet-nav-block mt-6 px-4">
          <p className="cabinet-nav-label mb-2 px-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/50">
            Навигация
          </p>
          <nav className="flex flex-col gap-0.5 rounded-[10px] border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 p-1.5 shadow-[var(--shadow-subtle)]" aria-label="Навигация по кабинету">
            {NAV.map(({ label, href, icon: Icon, iconClass }) => (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 font-medium transition-colors ${
                  isActive(href)
                    ? navActiveClasses
                    : "border border-transparent text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
                }`}
                style={!isActive(href) && brandFont ? { color: `${brandFont}cc` } : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
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
            {user?.role === "ESTABLISHMENT_ADMIN" && (
              <Link
                href="/establishment"
                onClick={closeSidebar}
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 font-medium text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
                style={brandFont ? { color: `${brandFont}cc` } : undefined}
              >
                <Building2 className="h-5 w-5 shrink-0 !text-amber-400" aria-hidden />
                <span>Кабинет заведения</span>
              </Link>
            )}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className={`mt-4 flex ${CABINET_WAITER_BTN} w-full !justify-center gap-3 px-4 py-3 text-sm`}
          >
            <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      <main className="relative min-h-screen min-w-0 flex-1 overflow-x-hidden px-0 pt-2 pb-4 lg:px-0 lg:pt-3 lg:pr-4 lg:ml-0 lg:mr-0 flex flex-col">
        <div
          className="cabinet-main-block app-panel-main-surface relative z-10 mt-0 mr-0 mb-4 ml-0 flex min-h-0 w-full max-w-full flex-1 flex-col rounded-lg border-x border-b border-white/10 backdrop-blur-xl md:rounded-[10px] lg:mr-4 lg:ml-4"
          style={mainBlockStyle}
        >
          <div className="px-4 py-3 sm:px-6 md:py-6 lg:p-8" id="main-content">
            {children}
          </div>
        </div>
      </main>
      <CabinetMobileNavPortals />
    </div>
    </CabinetMobileNavProvider>
  );
}
