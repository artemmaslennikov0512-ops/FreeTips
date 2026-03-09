"use client";

import { usePathname } from "next/navigation";

export function LandingWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isLanding = pathname === "/";
  const isZayavka = pathname === "/zayavka";
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  const wrapperClass = isLanding ? "landing-page" : isZayavka ? "zayavka-page-wrapper" : isLoginPage ? "login-page-wrapper" : undefined;

  return (
    <div className={wrapperClass}>
      {children}
    </div>
  );
}
