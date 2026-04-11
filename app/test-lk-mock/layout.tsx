import type { Metadata } from "next";
import { TestLkMockLayoutClient } from "./TestLkMockLayoutClient";

export const metadata: Metadata = {
  title: "Тестовый ЛК",
  description:
    "Превью кабинета в новом стиле: те же названия и порядок разделов, что в /cabinet, плюс макетные сценарии «в разработке». /test-lk-mock/cabinet-nav — тот же вид с другим префиксом URL.",
  robots: { index: false, follow: false },
};

export default function TestLkMockLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <TestLkMockLayoutClient>{children}</TestLkMockLayoutClient>;
}
