import type { Metadata } from "next";
import { TestLkMockLayoutClient } from "./TestLkMockLayoutClient";

export const metadata: Metadata = {
  title: "Тестовый ЛК",
  description: "Изолированный макет кабинета с теми же разделами, что /cabinet. Без входа и без ваших данных.",
  robots: { index: false, follow: false },
};

export default function TestLkMockLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <TestLkMockLayoutClient>{children}</TestLkMockLayoutClient>;
}
