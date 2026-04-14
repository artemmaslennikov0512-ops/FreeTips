"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { LogOut, Menu, User, BadgeCheck, Building2 } from "lucide-react";
import { CABINET_WAITER_BTN } from "@/lib/cabinet-button-classes";

export type CabinetMobileNavUser = {
  login?: string;
  role?: string;
  fullName?: string | null;
  verificationStatus?: string;
  employeePhotoUrl?: string | null;
} | null;

export type CabinetNavDrawerItem = { label: string; href: string; icon: LucideIcon };

export type CabinetNavDrawerGroup = { title: string; items: CabinetNavDrawerItem[] };

export type CabinetMobileNavContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  closeSidebar: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  user: CabinetMobileNavUser;
  supportUnreadCount: number;
  navGroups: CabinetNavDrawerGroup[];
  isActive: (href: string) => boolean;
  navActiveClasses: string;
  handleLogout: () => Promise<void>;
  /** Подпись кнопки выхода (например, в режиме просмотра админом). */
  logoutButtonLabel: string;
  sidebarStyle: CSSProperties;
  profileBlockStyle: CSSProperties;
  sidebarBg: string | undefined;
  isM5Cabinet: boolean;
  brandFont: string | undefined;
  sidebarDisplayLabel: string;
  /** Первое слово ФИО — для стиля M5 как в десктоп-сайдбаре */
  sidebarFirstName: string | null;
};

const CabinetMobileNavContext = createContext<CabinetMobileNavContextValue | null>(null);

export function CabinetMobileNavProvider({
  value,
  children,
}: {
  value: CabinetMobileNavContextValue;
  children: ReactNode;
}) {
  return <CabinetMobileNavContext.Provider value={value}>{children}</CabinetMobileNavContext.Provider>;
}

export function useCabinetMobileNav(): CabinetMobileNavContextValue {
  const ctx = useContext(CabinetMobileNavContext);
  if (!ctx) throw new Error("useCabinetMobileNav: нет провайдера");
  return ctx;
}

const BTN_CLASS = `cabinet-menu-btn ${CABINET_WAITER_BTN} flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center !gap-0 !p-0 active:scale-95 transition-[transform,opacity]`;

/** Кнопка в правом верхнем углу карточки (дашборд) */
export function CabinetMobileNavCardButton() {
  const { menuButtonRef, sidebarOpen, setSidebarOpen } = useCabinetMobileNav();
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-20 sm:right-3 sm:top-3 lg:hidden">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setSidebarOpen((o) => !o)}
        className={`${BTN_CLASS} pointer-events-auto`}
        aria-label="Меню"
        aria-expanded={sidebarOpen}
        aria-haspopup="dialog"
        aria-controls="cabinet-nav-dropdown"
      >
        <Menu className="h-5 w-5 shrink-0 pointer-events-none" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/** Фиксированная кнопка под шапкой — остальные страницы ЛК */
export function CabinetMobileNavFixedButton() {
  const { menuButtonRef, sidebarOpen, setSidebarOpen } = useCabinetMobileNav();
  return (
    <button
      ref={menuButtonRef}
      type="button"
      onClick={() => setSidebarOpen((o) => !o)}
      className={`${BTN_CLASS} fixed z-[2005] lg:hidden`}
      style={{
        right: "max(0.75rem, env(safe-area-inset-right, 0px))",
        top: "max(5rem, calc(env(safe-area-inset-top, 0px) + 4.25rem))",
      }}
      aria-label="Меню"
      aria-expanded={sidebarOpen}
      aria-haspopup="dialog"
      aria-controls="cabinet-nav-dropdown"
    >
      <Menu className="h-5 w-5 shrink-0 pointer-events-none" strokeWidth={2} aria-hidden />
    </button>
  );
}

/** Затемнение + панель по центру экрана (вне stacking context карточки) */
export function CabinetMobileNavPortals() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const {
    sidebarOpen,
    closeSidebar,
    user,
    supportUnreadCount,
    navGroups,
    isActive,
    navActiveClasses,
    handleLogout,
    logoutButtonLabel,
    sidebarStyle,
    profileBlockStyle,
    sidebarBg,
    isM5Cabinet,
    brandFont,
    sidebarDisplayLabel,
    sidebarFirstName,
  } = useCabinetMobileNav();

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const onOverlayDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) closeSidebar();
    },
    [closeSidebar],
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className={`cabinet-mobile-nav-overlay fixed inset-0 z-[2000] transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onOverlayDown}
        role="presentation"
        aria-hidden={!sidebarOpen}
      />
      <div
        id="cabinet-nav-dropdown"
        role="dialog"
        aria-modal="true"
        aria-label="Меню навигации"
        className={`cabinet-mobile-nav-dialog cabinet-nav-dropdown fixed left-1/2 top-1/2 z-[2010] w-[min(calc(100vw-1.5rem),22rem)] max-h-[min(85dvh,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[10px] border border-[var(--color-brand-gold)]/20 shadow-[var(--shadow-card)] backdrop-blur-xl transition-[opacity,transform] duration-200 lg:hidden ${
          sidebarOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
        data-cabinet-theme={isM5Cabinet ? "m5-competition" : undefined}
        style={sidebarStyle}
        aria-hidden={!sidebarOpen}
      >
        <div className="cabinet-nav-dropdown-inner overflow-hidden rounded-[10px] px-3 py-3">
          <div
            className={`cabinet-sidebar-profile cabinet-block-inner mb-4 rounded-[10px] border border-[var(--color-brand-gold)]/20 px-3 py-2.5 ${!sidebarBg ? "bg-[var(--color-dark-gray)]/10" : ""}`}
            style={Object.keys(profileBlockStyle).length ? profileBlockStyle : undefined}
          >
            <div className="flex items-center gap-2.5">
              {user?.employeePhotoUrl ? (
                <Image
                  src={user.employeePhotoUrl}
                  alt=""
                  width={36}
                  height={36}
                  unoptimized
                  className="h-9 w-9 shrink-0 rounded-full object-cover bg-[var(--color-brand-gold)]"
                />
              ) : (
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] ${isM5Cabinet ? "text-white" : "text-[#0a192f]"}`}
                  aria-hidden
                >
                  <User className="h-5 w-5" strokeWidth={2} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span
                    className={`truncate font-medium text-sm ${isM5Cabinet && sidebarFirstName ? "text-[#8ec5ff]" : "text-[var(--color-text)]"}`}
                    style={!isM5Cabinet || !sidebarFirstName ? (brandFont ? { color: brandFont } : undefined) : undefined}
                  >
                    {sidebarDisplayLabel}
                  </span>
                  {user?.verificationStatus === "VERIFIED" && (
                    <BadgeCheck className={`h-4 w-4 shrink-0 ${isM5Cabinet ? "text-[#1c69d4]" : "text-blue-500"}`} aria-label="Верифицирован" />
                  )}
                </div>
                <div className="text-xs text-[var(--color-text)]/80" style={brandFont ? { color: brandFont } : undefined}>
                  Официант
                </div>
              </div>
            </div>
          </div>
          <p className="cabinet-nav-label mb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text)]/50">Навигация</p>
          <nav
            className="flex flex-col gap-0 rounded-[10px] border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 p-1.5 pb-2 shadow-[var(--shadow-subtle)]"
            role="none"
          >
            {navGroups.map((group) => (
              <div
                key={group.title}
                className="mt-3 border-t border-[var(--color-brand-gold)]/12 pt-3 first:mt-0 first:border-t-0 first:pt-0"
                role="group"
                aria-label={group.title}
              >
                <div className="px-2.5 pb-1.5 pt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]/40">
                  {group.title}
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.items.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeSidebar}
                      role="menuitem"
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-normal transition-colors ${
                        isActive(href)
                          ? navActiveClasses
                          : "border border-transparent text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
                      }`}
                      style={!isActive(href) && brandFont ? { color: `${brandFont}cc` } : undefined}
                    >
                      <Icon className="cabinet-nav-item-icon h-[18px] w-[18px] shrink-0" aria-hidden />
                      <span>{label}</span>
                      {href === "/cabinet/support" && supportUnreadCount > 0 && (
                        <span className="cabinet-support-unread-badge ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-xs font-semibold text-white">
                          {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {user?.role === "ESTABLISHMENT_ADMIN" && (
              <div className="mt-3 border-t border-[var(--color-brand-gold)]/12 pt-3" role="group" aria-label="Связанные кабинеты">
                <div className="px-2.5 pb-1.5 pt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]/40">
                  Связанные кабинеты
                </div>
                <div className="flex flex-col gap-0.5">
                  <Link
                    href="/establishment"
                    onClick={closeSidebar}
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 font-normal text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
                    style={brandFont ? { color: `${brandFont}cc` } : undefined}
                  >
                    <Building2 className="cabinet-nav-item-icon h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span>Кабинет заведения</span>
                  </Link>
                </div>
              </div>
            )}
          </nav>
          <button
            type="button"
            onClick={() => {
              closeSidebar();
              void handleLogout();
            }}
            className={`mt-8 flex shrink-0 ${CABINET_WAITER_BTN} w-full !justify-center gap-2.5 px-3 py-2 text-sm`}
            role="menuitem"
          >
            <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
            <span>{logoutButtonLabel}</span>
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
