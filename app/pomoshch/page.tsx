import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Shield, Smartphone, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "База знаний",
  description: "Материалы по подключению заведения, безопасности платежей и мобильному приложению FreeTips.",
};

const ARTICLES: { href: string; title: string; lead: string; Icon: typeof BookOpen }[] = [
  {
    href: "/pomoshch/podklyuchenie",
    title: "Как подключить заведение",
    lead: "Заявка, проверка и первые шаги после подключения.",
    Icon: Building2,
  },
  {
    href: "/pomoshch/bezopasnost-platezhey",
    title: "Безопасность платежей",
    lead: "Как устроена оплата для гостя и защита данных.",
    Icon: Shield,
  },
  {
    href: "/pomoshch/mobilnoe-prilozhenie",
    title: "Мобильное приложение",
    lead: "Вход по API-ключу, QR и история операций.",
    Icon: Smartphone,
  },
];

export default function PomoshchHubPage() {
  return (
    <>
      <div className="mb-10">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
          <BookOpen className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="font-[family:var(--font-playfair)] text-3xl font-semibold text-[var(--color-text)] sm:text-4xl">База знаний</h1>
        <p className="mt-3 text-[var(--color-text-secondary)] leading-relaxed">
          Краткие материалы о сервисе. Юридические условия — в разделе документов в подвале сайта. Остались вопросы —{" "}
          <Link href="/kontakty" className="text-[var(--color-accent-gold)] underline-offset-2 hover:underline">
            контакты поддержки
          </Link>
          .
        </p>
      </div>
      <ul className="list-none space-y-4 p-0">
        {ARTICLES.map(({ href, title, lead, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-sides)] p-5 shadow-[var(--shadow-subtle)] transition-all hover:border-[var(--color-accent-gold)]/40 hover:shadow-[var(--shadow-card)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-light-gray)] text-[var(--color-navy)]">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-[var(--color-text)]">{title}</span>
                <span className="mt-1 block text-sm text-[var(--color-text-secondary)] leading-relaxed">{lead}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
