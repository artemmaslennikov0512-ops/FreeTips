import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Нужно ли гостю устанавливать приложение?",
    a: "Нет. Гость сканирует QR или открывает ссылку в браузере и оплачивает картой, Apple Pay или Google Pay — как привык.",
  },
  {
    q: "Как сотрудник получает чаевые?",
    a: "После успешной оплаты средства учитываются в личном кабинете; вывод на карту настраивается в сервисе согласно правилам и лимитам.",
  },
  {
    q: "Чем FreeTips отличается от перевода «на карту»?",
    a: "Единая брендированная страница оплаты, учёт для заведения, поддержка и прозрачная история операций — без передачи личного номера карты гостю.",
  },
  {
    q: "Сколько стоит подключение для заведения?",
    a: "Условия и тарифы указаны в договорной документации и на странице оферты. Точные условия согласуются при подключении.",
  },
  {
    q: "Как подключить заведение?",
    a: "Оставьте заявку на сайте — мы свяжемся с вами, поможем с настройкой бренда, QR и доступом для сотрудников.",
  },
] as const;

export function FaqPremium() {
  return (
    <section
      id="quest"
      className="section-dark relative w-full overflow-hidden bg-[var(--color-navy)] py-12 sm:py-16 lg:py-[100px] scroll-mt-24"
      aria-labelledby="faq-heading"
    >
      <div
        className="absolute inset-0 z-[0] opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><path d='M0,0 L80,0 L80,80' fill='none' stroke='white' stroke-width='1.5'/></svg>")`,
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-navy)] to-[var(--color-charcoal)]/35 pointer-events-none z-[1]" aria-hidden />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-screen-2xl">
        <div className="mx-auto max-w-[720px] text-center mb-10 sm:mb-14">
          <h2 id="faq-heading" className="font-[family:var(--font-playfair)] text-2xl sm:text-3xl lg:text-4xl font-semibold text-[var(--color-on-navy)] mb-3">
            Частые вопросы
          </h2>
          <p className="text-lg text-[var(--color-on-dark-muted)]">
            Кратко о том, как устроен сервис. Подробности — в разделе документов и у поддержки.
          </p>
        </div>
        <ul className="mx-auto max-w-[800px] list-none space-y-3 p-0">
          {FAQ_ITEMS.map(({ q, a }) => (
            <li key={q}>
              <details className="group rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-sm open:bg-white/[0.09] transition-colors">
                <summary className="cursor-pointer list-none px-5 py-4 pr-12 font-semibold text-[var(--color-on-navy)] marker:content-none [&::-webkit-details-marker]:hidden relative flex items-center justify-between gap-3">
                  <span>{q}</span>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-[var(--color-accent-gold)] transition-transform group-open:rotate-180 pointer-events-none"
                    strokeWidth={2}
                    aria-hidden
                  />
                </summary>
                <p className="border-t border-white/10 px-5 pb-4 pt-3 text-[15px] leading-relaxed text-[var(--color-on-dark-muted)]">{a}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
