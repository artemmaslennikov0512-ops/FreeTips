"use client";

import { usePathname } from "next/navigation";

export function LandingWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isLanding = pathname === "/";
  const isZayavka = pathname === "/zayavka";

  const wrapperClass = isLanding ? "landing-page" : isZayavka ? "zayavka-page-wrapper" : undefined;

  return (
    <div className={wrapperClass}>
      {children}
    </div>
  );
}
