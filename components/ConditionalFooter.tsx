"use client";

import { usePathname } from "next/navigation";
import { FooterPremium } from "@/components/FooterPremium";

export function ConditionalFooter() {
  const pathname = usePathname() ?? "";

  if (
    pathname.startsWith("/cabinet") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/establishment") ||
    pathname.startsWith("/pay") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/zayavka" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return null;
  }

  return <FooterPremium />;
}
