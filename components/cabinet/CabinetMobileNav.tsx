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
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { LogOut, User, BadgeCheck, Building2 } from "lucide-react";
import { CABINET_WAITER_BTN } from "@/lib/cabinet-button-classes";
import {
  PANEL_MOBILE_NAV_OVERLAY_TRANSITION,
  PANEL_MOBILE_NAV_SHELL_TRANSITION,
  PANEL_MOBILE_PORTAL_SAFE_PADDING_COMPACT,
  PANEL_MOBILE_Z_NAV_PORTAL_LAYER,
  PANEL_MOBILE_Z_NAV_PORTAL_SHELL,
} from "@/lib/panel-mobile-ui";
import { PanelMobileTopChrome } from "@/components/PanelMobileTopChrome";
import { useTheme } from "@/lib/theme-context";
import { applyDocumentShellChrome } from "@/lib/document-shell-chrome";
import { usePanelMobileSimpleDrawerEffects } from "@/lib/use-panel-mobile-simple-drawer-effects";

export type CabinetMobileNavUser = {
  login?: string;
  role?: string;
  fullName?: string | null;
  verificationStatus?: string;
  employeePhotoUrl?: string | null;
} | null;

type CabinetNavDrawerItem = { label: string; href: string; icon: LucideIcon };

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

function useCabinetMobileNav(): CabinetMobileNavContextValue {
  const ctx = useContext(CabinetMobileNavContext);
  if (!ctx) throw new Error("useCabinetMobileNav: нет провайдера");
  return ctx;
}

/**
 * Мобильный ЛК: в потоке документа (уезжает при прокрутке) — тема + меню, одна золотая полоска снизу.
 */
export function CabinetMobileNavMobileCorner({ leadingSlot }: { leadingSlot?: ReactNode }) {
  const { menuButtonRef, sidebarOpen, setSidebarOpen, isM5Cabinet } = useCabinetMobileNav();
  return (
    <PanelMobileTopChrome
      leadingSlot={leadingSlot}
      menuButtonRef={menuButtonRef}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      ariaControls="cabinet-nav-dropdown"
      menuButtonExtraClassName={isM5Cabinet ? "site-header-m5-menu-btn" : ""}
      themeToggleVariant={isM5Cabinet ? "m5" : "default"}
    />
  );
}

/** Затемнение + панель по центру экрана (вне stacking context карточки) */
export function CabinetMobileNavPortals() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const pathname = usePathname();
  const { theme } = useTheme();
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

  /* Тот же стек, что админка / заведение: scroll lock + chrome + Escape — см. usePanelMobileSimpleDrawerEffects. */
  usePanelMobileSimpleDrawerEffects(sidebarOpen, closeSidebar);

  /* После открытия шторки — один отложенный apply (двойной rAF внутри document-shell-chrome). */
  useEffect(() => {
    if (!sidebarOpen) return;
    applyDocumentShellChrome(pathname, theme);
  }, [sidebarOpen, pathname, theme]);

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
        className={`cabinet-mobile-nav-overlay mobile-drawer-screen-bleed fixed ${PANEL_MOBILE_Z_NAV_PORTAL_LAYER} ${PANEL_MOBILE_NAV_OVERLAY_TRANSITION} ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onOverlayDown}
        role="presentation"
        aria-hidden={!sidebarOpen}
      />
      <div
        className={`cabinet-mobile-nav-shell mobile-drawer-screen-bleed pointer-events-none fixed ${PANEL_MOBILE_Z_NAV_PORTAL_SHELL} flex items-center justify-center px-3 py-1 ${PANEL_MOBILE_NAV_SHELL_TRANSITION} sm:px-4 ${
          sidebarOpen ? "opacity-100" : "opacity-0"
        }`}
        style={PANEL_MOBILE_PORTAL_SAFE_PADDING_COMPACT}
        aria-hidden={!sidebarOpen}
      >
        <div
          id="cabinet-nav-dropdown"
          role="dialog"
          aria-modal="true"
          aria-label="Меню навигации"
          className={`cabinet-mobile-nav-dialog cabinet-nav-dropdown cabinet-mobile-nav-dialog--modal pointer-events-auto flex h-auto max-h-[min(calc(100svh-0.5rem),calc(100dvh-0.5rem))] min-h-0 w-[min(22rem,calc(100vw-1.5rem))] max-w-full flex-col overflow-hidden rounded-xl border border-[var(--color-brand-gold)]/25 shadow-[var(--shadow-card)] backdrop-blur-xl transition-[opacity,transform] duration-200 ${
            sidebarOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
          }`}
          data-cabinet-theme={isM5Cabinet ? "m5-competition" : undefined}
          style={sidebarStyle}
          aria-hidden={!sidebarOpen}
        >
        <div className="cabinet-nav-dropdown-inner flex min-h-0 flex-col overflow-hidden px-3 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-2.5">
          <div
            className={`cabinet-sidebar-profile cabinet-block-inner mb-2 shrink-0 rounded-[10px] border border-[var(--color-brand-gold)]/20 px-3 py-2 ${!sidebarBg ? "bg-[var(--color-dark-gray)]/10" : ""}`}
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
          <p className="cabinet-nav-label mb-1.5 shrink-0 px-3 text-center text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--color-text)]/50">
            Навигация
          </p>
          <nav
            className="cabinet-mobile-nav-dialog__nav flex min-h-0 max-h-[min(22rem,calc(100dvh-12rem))] flex-col gap-0 overflow-y-auto overscroll-contain rounded-[10px] border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 p-1 pb-1.5 shadow-[var(--shadow-subtle)]"
            role="none"
          >
            {navGroups.map((group) => (
              <div
                key={group.title}
                className="mt-2 border-t border-[var(--color-brand-gold)]/12 pt-2 first:mt-0 first:border-t-0 first:pt-1.5"
                role="group"
                aria-label={group.title}
              >
                <div className="cabinet-nav-group-title px-2.5 pb-1 pt-0.5 text-[0.625rem] font-semibold uppercase leading-snug tracking-[0.12em]">
                  {group.title}
                </div>
                <div className="flex flex-col gap-px">
                  {group.items.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeSidebar}
                      role="menuitem"
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-normal leading-snug transition-colors ${
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
              <div className="mt-2 border-t border-[var(--color-brand-gold)]/12 pt-2" role="group" aria-label="Связанные кабинеты">
                <div className="cabinet-nav-group-title px-2.5 pb-1 pt-0.5 text-[0.625rem] font-semibold uppercase leading-snug tracking-[0.12em]">
                  Связанные кабинеты
                </div>
                <div className="flex flex-col gap-px">
                  <Link
                    href="/establishment"
                    onClick={closeSidebar}
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[0.8125rem] font-normal leading-snug text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
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
            className={`mt-3 flex shrink-0 ${CABINET_WAITER_BTN} w-full !justify-center gap-2.5 px-3 py-1.5 text-sm`}
            role="menuitem"
          >
            <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
            <span>{logoutButtonLabel}</span>
          </button>
        </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
