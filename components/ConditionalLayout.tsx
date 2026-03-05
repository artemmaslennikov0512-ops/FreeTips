"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { ConditionalFooter } from "@/components/ConditionalFooter";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isLanding = pathname === "/";
  const isCabinet = pathname.startsWith("/cabinet");
  const isAdmin = pathname.startsWith("/admin");
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/zayavka";
  const isPayPage = pathname.startsWith("/pay");
  const widthClass = isCabinet || isAdmin ? "max-w-none bg-transparent" : isLanding ? "max-w-none bg-[var(--color-bg)]" : "mx-auto max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl bg-[var(--color-bg)]";

  return (
    <div className={`flex min-h-screen w-full min-w-0 flex-1 flex-col border-0 ${widthClass} ${isAuthPage ? "layout-auth" : ""}`}
    >
      {!isPayPage && <Header />}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <ConditionalFooter />
    </div>
  );
}
