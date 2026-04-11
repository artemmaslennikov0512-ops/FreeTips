"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Mic2,
  QrCode,
  Radio,
  Shield,
  Sparkles,
  UtensilsCrossed,
  Wallet,
  ChevronDown,
} from "lucide-react";
import "./test-preview-landing-alt.css";

const FAQ = [
  {
    q: "Нужно ли гостю устанавливать приложение?",
    a: "Нет. Оплата проходит в браузере по ссылке или QR-коду.",
  },
  {
    q: "Как подключить заведение?",
    a: "Оставьте заявку — мы поможем с настройкой и материалами для зала.",
  },
  {
    q: "Чем донаты стримера отличаются от чаевых?",
    a: "Тот же безопасный сценарий оплаты: зритель выбирает сумму и может оставить сообщение. На тестовой странице списания нет.",
  },
  {
    q: "Планируется ли интеграция со стримом (OBS и т.п.)?",
    a: "В превью заложены сценарии: оповещения о донатах, цели сбора, публичная страница — в продукте часть функций ещё в разработке.",
  },
];

export function TestPreviewLandingAlt() {
  return (
    <div className="test-preview-landing-alt min-w-0" style={{ backgroundColor: "var(--tpa-bg)" }}>
      <section className="tpa-mesh-bg border-b px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10" style={{ borderColor: "var(--tpa-border)" }}>
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--tpa-border)", color: "var(--tpa-accent)" }}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Макет нового визуала · только превью
          </p>
          <h1 className="max-w-3xl font-[family-name:var(--font-syne)] text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl" style={{ color: "var(--tpa-text)" }}>
            Чаевые в зале и донаты в эфире — в одной логике сервиса
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed sm:text-xl" style={{ color: "var(--tpa-muted)" }}>
            Гость или зритель платит привычным способом. Получатель видит операции в личном кабинете. Этот экран — отдельное оформление, чтобы вы могли сравнить с текущим сайтом.
          </p>
          <p className="mt-4 text-sm font-medium">
            <Link href="/test-lk-mock" className="inline-flex items-center gap-1.5 no-underline hover:underline" style={{ color: "var(--tpa-accent)" }}>
              Тестовый ЛК в новой палитре (превью)
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/zayavka"
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white no-underline transition hover:opacity-95"
              style={{ backgroundColor: "var(--tpa-accent)" }}
            >
              Подключиться
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/test-preview/donate/demo"
              className="inline-flex items-center gap-2 rounded-2xl border px-6 py-3.5 text-sm font-semibold no-underline transition hover:opacity-90"
              style={{ borderColor: "var(--tpa-border)", color: "var(--tpa-text)", backgroundColor: "var(--tpa-surface)" }}
            >
              Демо-донат (заглушка)
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium no-underline underline-offset-4 hover:underline"
              style={{ color: "var(--tpa-muted)" }}
            >
              Текущий сайт
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-14 sm:px-6 sm:py-20" style={{ borderColor: "var(--tpa-border)", backgroundColor: "var(--tpa-surface)" }}>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--tpa-accent)" }}>
              Как на главной
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--tpa-text)" }}>
              Тот же визуальный якорь: гость, QR и экран оплаты
            </h2>
            <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--tpa-muted)" }}>
              Фото с текущего лендинга — здесь оно показывает преемственность; оформление блоков и акценты — в стиле превью (бирюза, Syne).
            </p>
            <ul className="mt-6 space-y-3 text-sm" style={{ color: "var(--tpa-muted)" }}>
              <li className="flex gap-2">
                <Radio className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--tpa-accent)" }} aria-hidden />
                <span>
                  <strong style={{ color: "var(--tpa-text)" }}>Стрим:</strong> публичная страница доната, сообщение зрителя, учёт в кабинете — в макете ЛК помечено «в разработке».
                </span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--tpa-accent)" }} aria-hidden />
                <span>
                  <strong style={{ color: "var(--tpa-text)" }}>В планах продукта:</strong> цели сбора на экране, оповещения для эфира, сценарии зала (брони, смена) — без обещания сроков на этом превью.
                </span>
              </li>
            </ul>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold no-underline hover:underline"
              style={{ color: "var(--tpa-accent)" }}
            >
              Открыть текущий сайт
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div
            className="relative min-h-[220px] overflow-hidden rounded-2xl border shadow-sm sm:min-h-[280px] lg:min-h-[320px]"
            style={{
              borderColor: "var(--tpa-border)",
              backgroundImage: "url('/images/waiter-qr-guest-success-freetips-ui.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            role="img"
            aria-label="Иллюстрация: официант с QR и гость с экраном успешной оплаты"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--tpa-ink)]/45 via-transparent to-transparent" aria-hidden />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20" style={{ backgroundColor: "var(--tpa-bg)" }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--tpa-text)" }}>
            Для кого
          </h2>
          <p className="mt-2 max-w-2xl text-base" style={{ color: "var(--tpa-muted)" }}>
            Те же сценарии продукта, но в макете явно выделен поток для стримеров — как в продуктовой симуляции.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <div className="tpa-card p-6 sm:p-7">
              <UtensilsCrossed className="h-9 w-9" style={{ color: "var(--tpa-accent)" }} aria-hidden />
              <h3 className="mt-4 text-lg font-semibold" style={{ color: "var(--tpa-text)" }}>
                Официанты и сервис
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--tpa-muted)" }}>
                Персональная ссылка и QR, история чаевых, выплаты — как в боевом кабинете.
              </p>
            </div>
            <div className="tpa-card p-6 sm:p-7">
              <Building2 className="h-9 w-9" style={{ color: "var(--tpa-accent)" }} aria-hidden />
              <h3 className="mt-4 text-lg font-semibold" style={{ color: "var(--tpa-text)" }}>
                Заведения
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--tpa-muted)" }}>
                Пул, бренд на странице оплаты, команда и аналитика — без изменений по смыслу, другой визуал превью.
              </p>
            </div>
            <div className="tpa-card relative overflow-hidden p-6 sm:p-7 ring-2 ring-teal-500/25">
              <div className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ backgroundColor: "var(--tpa-accent)" }}>
                Новый акцент
              </div>
              <Mic2 className="h-9 w-9" style={{ color: "var(--tpa-accent)" }} aria-hidden />
              <h3 className="mt-4 text-lg font-semibold" style={{ color: "var(--tpa-text)" }}>
                Стримеры
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--tpa-muted)" }}>
                Публичная страница доната, сообщение от зрителя, учёт в кабинете (на превью — макеты и заглушка оплаты).
              </p>
              <Link
                href="/test-lk-mock/cabinet-nav/streamer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold no-underline hover:underline"
                style={{ color: "var(--tpa-accent)" }}
              >
                Макет раздела в ЛК (в разработке)
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-14 sm:px-6 sm:py-20" style={{ borderColor: "var(--tpa-border)", backgroundColor: "var(--tpa-surface)" }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--tpa-text)" }}>
            Как это работает
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { step: "01", title: "Ссылка или QR", body: "Гость или зритель переходит по вашей ссылке или сканирует код.", Icon: QrCode },
              { step: "02", title: "Сумма и сообщение", body: "Выбирает сумму, при желании оставляет текст — для стримов это часть сценария.", Icon: Radio },
              { step: "03", title: "Оплата", body: "На проде — банковская оплата. В превью доната — только имитация успеха.", Icon: Wallet },
            ].map(({ step, title, body, Icon }) => (
              <li key={step} className="tpa-card flex flex-col p-6">
                <span className="font-mono text-xs font-bold" style={{ color: "var(--tpa-accent)" }}>
                  {step}
                </span>
                <Icon className="mt-3 h-8 w-8" style={{ color: "var(--tpa-text)" }} aria-hidden />
                <h3 className="mt-3 text-base font-semibold" style={{ color: "var(--tpa-text)" }}>
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--tpa-muted)" }}>
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20" style={{ backgroundColor: "var(--tpa-bg)" }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--tpa-text)" }}>
            Возможности
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Безопасность", desc: "Платёжные данные обрабатывает банк; сервис не хранит полные реквизиты карты.", Icon: Shield },
              { title: "Скорость", desc: "Короткий путь от намерения до «спасибо» — без регистрации для плательщика.", Icon: Sparkles },
              { title: "Бренд заведения", desc: "Страница оплаты может отражать стиль точки.", Icon: Building2 },
              { title: "Кабинет", desc: "Операции, сессии, поддержка — как в текущей версии продукта.", Icon: Wallet },
            ].map(({ title, desc, Icon }) => (
              <div key={title} className="tpa-card p-5">
                <Icon className="h-7 w-7" style={{ color: "var(--tpa-accent)" }} aria-hidden />
                <h3 className="mt-3 text-sm font-semibold" style={{ color: "var(--tpa-text)" }}>
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--tpa-muted)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-14 sm:px-6 sm:py-20" style={{ borderColor: "var(--tpa-border)", backgroundColor: "var(--tpa-surface)" }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--tpa-text)" }}>
            Вопросы
          </h2>
          <div className="mt-8 space-y-2">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="tpa-card group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 pr-3 font-medium sm:p-5 [&::-webkit-details-marker]:hidden" style={{ color: "var(--tpa-text)" }}>
                  {q}
                  <ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" style={{ color: "var(--tpa-muted)" }} aria-hidden />
                </summary>
                <p className="border-t px-4 pb-4 pt-0 text-sm leading-relaxed sm:px-5 sm:pb-5" style={{ borderColor: "var(--tpa-border)", color: "var(--tpa-muted)" }}>
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="tpa-mesh-bg border-t px-4 py-16 sm:px-6 sm:py-20" style={{ borderColor: "var(--tpa-border)" }}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--tpa-text)" }}>
            Готовы обсудить внедрение?
          </h2>
          <p className="mt-3 text-base" style={{ color: "var(--tpa-muted)" }}>
            Сравните этот макет с главной страницей сайта и решите, двигаться ли в таком направлении визуально.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/zayavka"
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold no-underline transition"
              style={{ backgroundColor: "var(--tpa-accent)", color: "var(--tpa-ink)" }}
            >
              Оставить заявку
            </Link>
            <Link
              href="/test-preview"
              className="inline-flex items-center gap-2 rounded-2xl border px-6 py-3.5 text-sm font-semibold no-underline transition hover:opacity-90"
              style={{ borderColor: "var(--tpa-border)", color: "var(--tpa-text)", backgroundColor: "var(--tpa-surface)" }}
            >
              Все тестовые страницы
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
