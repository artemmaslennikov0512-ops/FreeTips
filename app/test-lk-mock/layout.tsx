import type { Metadata } from "next";
import { TestLkMockLayoutClient } from "./TestLkMockLayoutClient";

export const metadata: Metadata = {
  title: "Тестовый ЛК",
  description:
    "Превью кабинета: /test-lk-mock — новая палитра; /test-lk-mock/cabinet-nav — меню как в /cabinet. Без входа и без ваших данных.",
  robots: { index: false, follow: false },
};

export default function TestLkMockLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <TestLkMockLayoutClient>{children}</TestLkMockLayoutClient>;
}
