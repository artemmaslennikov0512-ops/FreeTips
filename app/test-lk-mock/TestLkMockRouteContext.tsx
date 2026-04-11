"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export type TestLkNavMode = "design" | "cabinet";

type Ctx = {
  basePath: string;
  navMode: TestLkNavMode;
};

const TestLkMockRouteContext = createContext<Ctx>({
  basePath: "/test-lk-mock",
  navMode: "design",
});

export function TestLkMockRouteProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const value = useMemo<Ctx>(() => {
    const cabinet = pathname.startsWith("/test-lk-mock/cabinet-nav");
    return {
      basePath: cabinet ? "/test-lk-mock/cabinet-nav" : "/test-lk-mock",
      navMode: cabinet ? "cabinet" : "design",
    };
  }, [pathname]);
  return <TestLkMockRouteContext.Provider value={value}>{children}</TestLkMockRouteContext.Provider>;
}

export function useTestLkMockRoute(): Ctx {
  return useContext(TestLkMockRouteContext);
}
