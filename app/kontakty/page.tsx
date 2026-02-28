import type { Metadata } from "next";
import { site, isPlaceholder } from "@/config/site";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";

const { operator, support } = site.footer;

export const metadata: Metadata = {
  title: "Контакты — FreeTips",
  description: "Контактная информация и реквизиты оператора.",
};

export default function KontaktyPage() {
  const hasOperator = !isPlaceholder(operator.name);
  const hasPhone = !isPlaceholder(support.phone);
  const hasEmail = !isPlaceholder(support.email);
  const hasTg = support.telegram && !isPlaceholder(support.telegram);

  return (
    <article className="relative min-h-screen overflow-hidden bg-[var(--color-bg)]">
      <div className="relative mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 xl:max-w-4xl 2xl:max-w-5xl">
        <h1 className="text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
          Контактная информация
        </h1>
        <p className="mt-4 text-[var(--color-text-secondary)]">
          Реквизиты оператора и техническая поддержка. Напишите или позвоните — ответим в рабочее время.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {hasOperator && (
            <section className="card-block rounded-2xl border-0 bg-[var(--color-bg-sides)] p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-medium)]">
              <h2 className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
                <MapPin className="h-5 w-5 text-[var(--color-accent-gold)]" />
                Оператор
              </h2>
              <div className="mt-4 space-y-4 text-[var(--color-text-secondary)] text-center">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Название</h3>
                  <p className="mt-0.5 font-medium text-[var(--color-text)]">{operator.name}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Адрес</h3>
                  <p className="mt-0.5">Юридический: {operator.address}</p>
                  {"addressActual" in operator &&
                    operator.addressActual &&
                    String(operator.addressActual) !== String(operator.address) && (
                      <p className="mt-0.5">Фактический: {operator.addressActual}</p>
                    )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">ИНН / ОГРН</h3>
                  <p className="mt-0.5">ИНН {operator.inn} · ОГРНИП {operator.ogrn}</p>
                </div>
                {"bank" in operator && operator.bank && (
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Банк</h3>
                    <p className="mt-0.5">{operator.bank}</p>
                    <p className="mt-0.5">БИК {operator.bik} · к/с {operator.ks} · р/с {operator.rs}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="card-block rounded-2xl border-0 bg-[var(--color-bg-sides)] p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-medium)]">
            <h2 className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
              <MessageCircle className="h-5 w-5 text-[var(--color-accent-gold)]" />
              Поддержка
            </h2>
            <ul className="mt-4 space-y-3 text-[var(--color-text-secondary)]">
              {hasPhone && (
                <li>
                  <a
                    href={`tel:${support.phone.replace(/\D/g, "")}`}
                    className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-gold)] transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    {support.phone}
                  </a>
                </li>
              )}
              {hasEmail && (
                <li>
                  <a
                    href={`mailto:${support.email}`}
                    className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-gold)] transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {support.email}
                  </a>
                </li>
              )}
              {hasTg && (
                <li>
                  <a
                    href={support.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-gold)] transition-colors"
                  >
                    Telegram
                  </a>
                </li>
              )}
              {!hasPhone && !hasEmail && !hasTg && (
                <li className="text-[var(--color-muted)]">Контакты будут добавлены</li>
              )}
            </ul>
          </section>
        </div>

        {!hasOperator && (
          <p className="mt-8 text-[var(--color-muted)] text-sm">
            Реквизиты оператора будут добавлены после предоставления данных.
          </p>
        )}

        <div className="mt-12">
          <Link
            href="/"
            className="text-[var(--color-accent-gold)] font-medium hover:opacity-90 hover:underline transition-colors"
          >
            ← На главную
          </Link>
        </div>
      </div>
    </article>
  );
}
