import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Превью (тест)",
  description: "Тестовые страницы: лендинг, донат стримера. Без реальных платежей.",
  robots: { index: false, follow: false },
};

export default function TestPreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
