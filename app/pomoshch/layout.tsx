import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "База знаний",
  description: "Статьи и ответы по подключению FreeTips, оплате и безопасности.",
};

export default function PomoshchLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>;
}
