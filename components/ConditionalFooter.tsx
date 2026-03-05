"use client";

import { usePathname } from "next/navigation";
import { FooterPremium } from "@/components/FooterPremium";

export function ConditionalFooter() {
  const pathname = usePathname() ?? "";

  if (
    pathname.startsWith("/cabinet") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/pay") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/zayavka"
  ) {
    return null;
  }

  return <FooterPremium />;
}
