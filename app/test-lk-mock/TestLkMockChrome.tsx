"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTestLkMockRoute } from "./TestLkMockRouteContext";

export function TestLkMockPageBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1280px]">{children}</div>;
}

export function TestLkBreadcrumb({ segment }: { segment: string }) {
  const { basePath } = useTestLkMockRoute();
  return (
    <nav className="tlk-type-body-muted mb-4 flex flex-wrap items-center gap-1" aria-label="Хлебные крошки">
      <Link href={basePath} className="tlk-type-body-muted no-underline hover:underline">
        Тестовый ЛК
      </Link>
      <span aria-hidden>/</span>
      <span className="tlk-type-body" style={{ color: "var(--tlk-text)" }}>
        {segment}
      </span>
    </nav>
  );
}

export function TestLkBackToSite() {
  return (
    <p className="tlk-type-body-muted mt-10 flex flex-wrap items-center gap-2">
      <ChevronLeft className="h-4 w-4" aria-hidden />
      <Link href="/" className="tlk-type-body font-medium underline-offset-2 hover:underline" style={{ color: "var(--tlk-primary)" }}>
        На главную сайта
      </Link>
    </p>
  );
}

export function testLkCardStyle(): CSSProperties {
  return { borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" };
}
