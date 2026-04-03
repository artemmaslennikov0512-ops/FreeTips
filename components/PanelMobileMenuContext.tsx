"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { usePathname } from "next/navigation";

type PanelMobileMenuContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  closeSidebar: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
};

const PanelMobileMenuContext = createContext<PanelMobileMenuContextValue | null>(null);

export function PanelMobileMenuProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSidebarOpen(false);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  const value = useMemo<PanelMobileMenuContextValue>(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      closeSidebar,
      menuButtonRef,
    }),
    [sidebarOpen, closeSidebar],
  );

  return <PanelMobileMenuContext.Provider value={value}>{children}</PanelMobileMenuContext.Provider>;
}

export function usePanelMobileMenu(): PanelMobileMenuContextValue {
  const ctx = useContext(PanelMobileMenuContext);
  if (!ctx) throw new Error("usePanelMobileMenu: нет PanelMobileMenuProvider");
  return ctx;
}

/** Шапка рендерится и вне провайдера (не ЛК) — без исключения. */
export function useOptionalPanelMobileMenu(): PanelMobileMenuContextValue | null {
  return useContext(PanelMobileMenuContext);
}
