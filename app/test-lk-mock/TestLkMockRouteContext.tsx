"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type Ctx = {
  basePath: string;
};

const TestLkMockRouteContext = createContext<Ctx>({
  basePath: "/test-lk-mock",
});

export function TestLkMockRouteProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const value = useMemo<Ctx>(() => {
    const alt = pathname.startsWith("/test-lk-mock/cabinet-nav");
    return {
      basePath: alt ? "/test-lk-mock/cabinet-nav" : "/test-lk-mock",
    };
  }, [pathname]);
  return <TestLkMockRouteContext.Provider value={value}>{children}</TestLkMockRouteContext.Provider>;
}

export function useTestLkMockRoute(): Ctx {
  return useContext(TestLkMockRouteContext);
}
