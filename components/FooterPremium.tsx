import Link from "next/link";
import { site } from "@/config/site";

const FOOTER_LINK_CLASS = "text-[var(--color-on-dark-muted)] hover:text-[var(--color-accent-gold)] transition-colors";

const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  { title: "Сервис", links: [{ href: "/#features", label: "Преимущества" }, { href: "/#process", label: "Как работает" }, { href: "/oferta", label: "Тарифы" }, { href: "/politika-bezopasnosti", label: "Безопасность" }] },
  { title: "Компания", links: [{ href: "/#about", label: "О нас" }, { href: "/kontakty", label: "Контакты" }] },
  { title: "Помощь", links: [{ href: "/kontakty", label: "Поддержка" }, { href: "/politika", label: "Документация" }] },
];

export function FooterPremium() {
  return (
    <footer className="bg-[var(--color-charcoal)] text-[var(--color-text-secondary)] py-12 sm:py-16 lg:py-20 pb-8 sm:pb-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-screen-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-16 gap-y-12 mb-16 items-start">
          <div className="flex flex-col gap-4 text-left">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-navy)] text-[var(--color-white)] font-bold text-lg">FT</span>
              <span className="font-[family:var(--font-playfair)] text-2xl font-bold text-[var(--color-on-dark)]">Free<span className="text-[var(--color-accent-gold)]">Tips</span></span>
            </Link>
            <p className="text-[15px] leading-relaxed text-[var(--color-on-dark-muted)] max-w-sm">
              Сервис премиальных чаевых для профессионалов. Безопасность, надёжность и уважение к труду.
            </p>
          </div>
          {FOOTER_COLUMNS.map(({ title, links }) => (
            <div key={title} className="text-left">
              <h4 className="font-sans text-lg font-semibold text-white mb-6">{title}</h4>
              <ul className="space-y-3 list-none pl-0">
                {links.map(({ href, label }) => (
                  <li key={href + label}><Link href={href} className={FOOTER_LINK_CLASS}>{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-10 border-0">
          <div className="text-sm text-[var(--color-muted)] text-center">
            © {new Date().getFullYear()} {site.name}. Все права защищены.
          </div>
        </div>
      </div>
    </footer>
  );
}
