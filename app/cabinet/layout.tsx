"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  ShieldCheck,
  BadgeCheck,
  Building2,
  ChevronDown,
} from "lucide-react";
import { getAccessToken, fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
const NAV = [
  { label: "Дашборд", href: "/cabinet", icon: LayoutDashboard },
  { label: "Операции", href: "/cabinet/transactions", icon: List },
  { label: "Моя ссылка", href: "/cabinet/link", icon: Link2 },
  { label: "Верификация", href: "/cabinet/verification", icon: ShieldCheck },
  { label: "Поддержка", href: "/cabinet/support", icon: MessageCircle },
  { label: "Настройки профиля", href: "/cabinet/settings", icon: Settings },
] as const;

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{
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

  useEffect(() => {
    if (brandMainBg) {
      document.body.style.backgroundColor = brandMainBg;
      return () => {
        document.body.style.backgroundColor = "";
      };
    }
  }, [brandMainBg]);

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

  const isActive = (href: string) =>
    href === "/cabinet" ? pathname === "/cabinet" : pathname.startsWith(href);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  const hasBrand =
    !!brandPrimary || !!brandSecondary || !!brandMainBg || !!brandBlocksBg || !!brandFont || !!brandBorder;
  const brandStyle: React.CSSProperties & Record<string, string> = {};
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
  const sidebarBg = brandBlocksBg ?? brandSecondary;
  const mainBlockBg = brandBlocksBg ?? brandSecondary;
  const sidebarStyle: React.CSSProperties = { backgroundColor: sidebarBg ?? "rgba(255,255,255,0.06)" };
  if (brandBorder) sidebarStyle.borderColor = brandBorder;
  const mainBlockStyle: React.CSSProperties = { backgroundColor: mainBlockBg ?? "rgba(255,255,255,0.06)" };
  if (brandBorder) mainBlockStyle.borderColor = brandBorder;
  const profileBlockStyle: React.CSSProperties = sidebarBg ? { backgroundColor: sidebarBg } : {};

  return (
    <div
      className="cabinet-premium flex min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-2"
      data-brand-active={hasBrand ? "true" : undefined}
      style={Object.keys(brandStyle).length ? brandStyle : undefined}
    >
      {/* Мобильная шторка — закрывает выпадающее меню при клике вне */}
      <div
        className={`cabinet-overlay fixed inset-0 z-30 bg-[rgba(15,23,42,0.65)] backdrop-blur-xl transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden
      />

      {/* Левое меню: только на десктопе (lg+); на мобильном навигация в выпадающем списке под кнопкой */}
      <div
        className={`cabinet-sidebar hidden lg:flex fixed left-0 top-0 z-40 h-full w-[min(calc(100vw-4rem),20rem)] max-w-[20rem] flex-col overflow-hidden border-0 border-r border-white/10 py-6 shadow-2xl backdrop-blur-xl transition-[transform] duration-300 ease-out lg:static lg:left-auto lg:top-auto lg:ml-0 lg:mt-2 lg:mr-0 lg:mb-0 lg:h-auto lg:max-h-[calc(100vh-2rem)] lg:w-[260px] lg:max-w-none lg:translate-x-0 lg:rounded-[10px] lg:border lg:self-start`}
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
              <div className="cabinet-sidebar-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] font-semibold text-[#0a192f] text-base">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-[var(--color-text)]" style={brandFont ? { color: brandFont } : undefined}>{displayName}</span>
                {user?.verificationStatus === "VERIFIED" && (
                  <BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" aria-label="Аккаунт верифицирован" />
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
            {NAV.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 font-medium transition-colors ${
                  isActive(href)
                    ? "cabinet-nav-active border border-[#0a192f]/25 bg-[#0a192f]/10 text-[#0a192f] font-semibold"
                    : "border border-transparent text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
                }`}
                style={!isActive(href) && brandFont ? { color: `${brandFont}cc` } : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
                {href === "/cabinet/support" && supportUnreadCount > 0 && (
                  <span
                    className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-xs font-semibold text-white"
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
                <Building2 className="h-5 w-5 shrink-0" />
                <span>Кабинет заведения</span>
              </Link>
            )}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-sm font-medium text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
            style={brandFont ? { color: `${brandFont}cc` } : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      <main
        className={`min-h-screen min-w-0 flex-1 overflow-x-hidden px-0 pt-2 pb-4 md:px-4 lg:pl-0 lg:pr-4 lg:ml-0 lg:mr-0 flex flex-col transition-[z-index] ${
          sidebarOpen ? "relative z-40 pointer-events-none lg:pointer-events-auto lg:z-auto" : ""
        }`}
      >
        {/* Основной блок — тянется до низа страницы с отступом */}
        <div
          className="cabinet-main-block mt-0 mr-0 mb-4 ml-0 lg:mr-4 lg:ml-4 flex min-h-0 flex-1 w-full max-w-full flex-col rounded-lg md:rounded-[10px] border border-white/10 backdrop-blur-xl"
          style={mainBlockStyle}
        >
          <div className="p-4 md:p-6 lg:p-8" id="main-content">
            <div className={`mb-4 lg:hidden relative ${sidebarOpen ? "pointer-events-auto" : ""}`}>
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="cabinet-menu-btn flex h-14 w-14 min-w-14 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 text-[var(--color-brand-gold)] hover:bg-[var(--color-brand-gold)]/20 hover:border-[var(--color-brand-gold)]/40 active:scale-95 transition-all"
                aria-label="Меню"
                aria-expanded={sidebarOpen}
                aria-haspopup="true"
                aria-controls="cabinet-nav-dropdown"
              >
                <Menu className="h-7 w-7" strokeWidth={2} />
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${sidebarOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
              <div
                id="cabinet-nav-dropdown"
                role="menu"
                className={`cabinet-nav-dropdown absolute left-0 top-full z-50 mt-2 w-[min(100vw-2rem,320px)] origin-top rounded-[10px] border border-[var(--color-brand-gold)]/20 shadow-[var(--shadow-card)] backdrop-blur-xl transition-[opacity,transform] duration-200 ${
                  sidebarOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                }`}
                style={sidebarStyle}
                aria-hidden={!sidebarOpen}
              >
                <div className="cabinet-nav-dropdown-inner overflow-hidden rounded-[10px] px-4 py-4">
                  <div className={`cabinet-sidebar-profile cabinet-block-inner mb-4 rounded-[10px] border border-[var(--color-brand-gold)]/20 px-3 py-2.5 ${!sidebarBg ? "bg-[var(--color-dark-gray)]/10" : ""}`} style={Object.keys(profileBlockStyle).length ? profileBlockStyle : undefined}>
                    <div className="flex items-center gap-2.5">
                      {user?.employeePhotoUrl ? (
                        <img src={user.employeePhotoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover bg-[var(--color-brand-gold)]" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] font-semibold text-[#0a192f] text-xs">{initials}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="truncate font-semibold text-[var(--color-text)] text-sm" style={brandFont ? { color: brandFont } : undefined}>{displayName}</span>
                          {user?.verificationStatus === "VERIFIED" && <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" aria-label="Верифицирован" />}
                        </div>
                        <div className="text-xs text-[var(--color-text)]/80" style={brandFont ? { color: brandFont } : undefined}>Официант</div>
                      </div>
                    </div>
                  </div>
                  <p className="cabinet-nav-label mb-2 px-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/50">Навигация</p>
                  <nav className="flex flex-col gap-0.5 rounded-[10px] border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 p-1.5 shadow-[var(--shadow-subtle)]" role="none">
                    {NAV.map(({ label, href, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeSidebar}
                        role="menuitem"
                        className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                          isActive(href) ? "cabinet-nav-active border border-[#0a192f]/25 bg-[#0a192f]/10 text-[#0a192f] font-semibold" : "border border-transparent text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
                        }`}
                        style={!isActive(href) && brandFont ? { color: `${brandFont}cc` } : undefined}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{label}</span>
                        {href === "/cabinet/support" && supportUnreadCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-xs font-semibold text-white">
                            {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
                          </span>
                        )}
                      </Link>
                    ))}
                    {user?.role === "ESTABLISHMENT_ADMIN" && (
                      <Link href="/establishment" onClick={closeSidebar} role="menuitem" className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 font-medium text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]" style={brandFont ? { color: `${brandFont}cc` } : undefined}>
                        <Building2 className="h-5 w-5 shrink-0" />
                        <span>Кабинет заведения</span>
                      </Link>
                    )}
                  </nav>
                  <button
                    type="button"
                    onClick={() => { closeSidebar(); handleLogout(); }}
                    className="mt-4 flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-sm font-medium text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
                    style={brandFont ? { color: `${brandFont}cc` } : undefined}
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
