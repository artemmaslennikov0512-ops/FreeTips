import Link from "next/link";
import { ArrowRight, LayoutDashboard, Palette, Radio, Sparkles } from "lucide-react";

const cards = [
  {
    title: "Визуал: палитра, формы, сетка (лендинг)",
    description: "Конкретные HEX, переменные CSS, пример формы, шаги отступов, 12-колоночная сетка — макет B.",
    href: "/test-preview/visual",
    icon: Palette,
  },
  {
    title: "Лендинг (новый макет)",
    description: "Отдельное оформление: типографика Syne, бирюзовый акцент, блоки «для кого» с потоком для стримеров, шаги, FAQ, CTA — сравните с главной /.",
    href: "/test-preview/landing",
    icon: Sparkles,
  },
  {
    title: "Тестовый личный кабинет",
    description: "Макет /cabinet: операции, ссылка, верификация, поддержка, сессии, настройки; плюс зал и донаты стримера.",
    href: "/test-lk-mock",
    icon: LayoutDashboard,
  },
  {
    title: "Страница доната (заглушка)",
    description: "Публичный экран для зрителя: сумма, сообщение, имитация оплаты без списания.",
    href: "/test-preview/donate/demo",
    icon: Radio,
  },
] as const;

export default function TestPreviewHubPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <p className="text-sm font-medium text-[var(--color-muted)]">FreeTips · внутреннее превью</p>
      <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl font-semibold tracking-tight text-[var(--color-text)] md:text-4xl">
        Тестовые страницы
      </h1>
      <p className="mt-3 text-[var(--color-muted)] leading-relaxed">
        Ниже — маршруты для просмотра лендинга, макета ЛК и доната. Реальные платежи не выполняются.
      </p>
      <ul className="mt-10 space-y-4">
        {cards.map(({ title, description, href, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex gap-4 rounded-2xl border border-[var(--color-dark-gray)]/20 bg-[var(--color-white)] p-5 no-underline shadow-[var(--shadow-subtle)] transition hover:border-[var(--color-brand-gold)]/50"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg)] text-[var(--color-brand-gold)]">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
                  {title}
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                </span>
                <span className="mt-1 block text-sm text-[var(--color-muted)] leading-snug">{description}</span>
                <span className="mt-2 block font-mono text-xs text-[var(--color-muted)]">{href}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
