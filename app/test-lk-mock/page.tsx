import type { Metadata } from "next";
import { TestLkMockClient } from "./TestLkMockClient";

export const metadata: Metadata = {
  title: "Тестовый ЛК (макет)",
  description: "Изолированный макет личного кабинета для дизайн-обсуждений. Не использует данные боевого /cabinet.",
  robots: { index: false, follow: false },
};

export default function TestLkMockPage() {
  return <TestLkMockClient />;
}
