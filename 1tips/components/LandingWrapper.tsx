"use client";

import { usePathname } from "next/navigation";

export function LandingWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isLanding = pathname === "/";

  return (
    <div className={isLanding ? "landing-page" : undefined}>
      {children}
    </div>
  );
}
