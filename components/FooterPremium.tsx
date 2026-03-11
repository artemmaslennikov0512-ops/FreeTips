import Link from "next/link";
import { site } from "@/config/site";
import { Mail, MessageCircle } from "lucide-react";

const FOOTER_LINK_CLASS = "text-[var(--color-on-dark-muted)] hover:text-[var(--color-accent-gold)] transition-colors";

function buildFooterColumns(): { title: string; links: { href: string; label: string }[] }[] {
  const docsColumn = {
    title: "Документы",
    links: site.footer.docs.map((d) => ({ href: d.href, label: d.label })),
  };
  return [
    { title: "Сервис", links: [{ href: "/#features", label: "Преимущества" }, { href: "/#process", label: "Как работает" }, { href: "/oferta", label: "Тарифы" }, { href: "/politika-bezopasnosti", label: "Безопасность" }] },
    docsColumn,
    { title: "Компания", links: [{ href: "/#about", label: "О нас" }, { href: "/kontakty", label: "Контакты" }] },
    { title: "Помощь", links: [{ href: "/kontakty", label: "Поддержка" }, { href: "/zayavka", label: "Оставить заявку" }] },
  ];
}

const FOOTER_COLUMNS = buildFooterColumns();

function telegramUsername(url: string): string {
  const match = url.match(/t\.me\/([^/?]+)/);
  return match ? `@${match[1]}` : url;
}

export function FooterPremium() {
  const { support } = site.footer;
  const hasEmail = support.email && !support.email.startsWith("[ЗАПОЛНИТЬ");
  const hasTg = support.telegram && support.telegram.trim() !== "";

  return (
    <footer className="bg-[var(--color-charcoal)] text-[var(--color-text-secondary)] py-14 sm:py-16 lg:py-24 pb-10 sm:pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-screen-2xl">
        {(hasEmail || hasTg) && (
          <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-8 gap-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] px-6 py-6 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
            <span className="text-sm font-medium uppercase tracking-wider text-white/80 leading-none sm:leading-normal">Связь и поддержка</span>
            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-6 sm:gap-8">
              {hasTg && (
                <a
                  href={support.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 text-[var(--color-on-dark-muted)] hover:text-[var(--color-accent-gold)] transition-colors"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" />
                  <span className="text-sm">{telegramUsername(support.telegram)}</span>
                </a>
              )}
              {hasEmail && (
                <a
                  href={`mailto:${support.email}`}
                  className="group inline-flex items-center gap-2.5 text-[var(--color-on-dark-muted)] hover:text-[var(--color-accent-gold)] transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" />
                  <span className="text-sm break-all">{support.email}</span>
                </a>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-16 gap-y-12 mb-16 items-start">
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
