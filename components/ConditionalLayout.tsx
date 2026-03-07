"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { ConditionalFooter } from "@/components/ConditionalFooter";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isLanding = pathname === "/";
  const isCabinet = pathname.startsWith("/cabinet");
  const isAdmin = pathname.startsWith("/admin");
  const isEstablishment = pathname.startsWith("/establishment");
  const isAuthPage =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname === "/zayavka" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/reset-password");
  const isPayPage = pathname.startsWith("/pay");
  const isZayavka = pathname === "/zayavka";
  const widthClass =
    isCabinet || isAdmin || isEstablishment
      ? "max-w-none bg-transparent"
      : isLanding
        ? "max-w-none bg-[var(--color-bg)]"
        : isPayPage
          ? "max-w-none bg-[var(--color-bg)]"
          : isZayavka
            ? "max-w-none"
            : "mx-auto max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl bg-[var(--color-bg)]";

  return (
    <div className={`flex min-h-screen w-full min-w-0 flex-1 flex-col border-0 ${widthClass} ${isAuthPage ? "layout-auth" : ""} ${isPayPage ? "layout-pay" : ""} ${isZayavka ? "layout-zayavka" : ""}`}
    >
      {!isPayPage && <Header />}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <ConditionalFooter />
    </div>
  );
}
